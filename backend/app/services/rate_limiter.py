import time
import threading
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status

class LoginRateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._ip_email_attempts: Dict[Tuple[str, str], List[float]] = {}
        self._ip_attempts: Dict[str, List[float]] = {}
        self._last_cleanup = time.time()

    def _cleanup(self, now: float) -> None:
        if now - self._last_cleanup < 300: # Cleanup every 5 minutes
            return
        self._last_cleanup = now
        # Purge ip_email older than 60s
        for key in list(self._ip_email_attempts.keys()):
            self._ip_email_attempts[key] = [t for t in self._ip_email_attempts[key] if now - t < 60]
            if not self._ip_email_attempts[key]:
                del self._ip_email_attempts[key]
        # Purge ip older than 3600s
        for ip in list(self._ip_attempts.keys()):
            self._ip_attempts[ip] = [t for t in self._ip_attempts[ip] if now - t < 3600]
            if not self._ip_attempts[ip]:
                del self._ip_attempts[ip]

    def check_and_record(self, ip: str, email: str) -> None:
        """
        Check rate limits and record the attempt.
        Max 5 attempts per minute per (IP + email).
        Max 20 attempts per hour per IP.
        """
        now = time.time()
        with self._lock:
            self._cleanup(now)
            norm_email = email.strip().lower()
            norm_ip = ip.strip()

            # 1. Check IP + Email (5 attempts per 60 seconds)
            ip_email_key = (norm_ip, norm_email)
            recent_ip_email = [t for t in self._ip_email_attempts.get(ip_email_key, []) if now - t < 60]
            self._ip_email_attempts[ip_email_key] = recent_ip_email

            if len(recent_ip_email) >= 5:
                retry_after = max(1, int(60 - (now - recent_ip_email[0])) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Trop de tentatives de connexion. Veuillez réessayer plus tard.",
                    headers={"Retry-After": str(retry_after)},
                )

            # 2. Check IP (20 attempts per 3600 seconds)
            recent_ip = [t for t in self._ip_attempts.get(norm_ip, []) if now - t < 3600]
            self._ip_attempts[norm_ip] = recent_ip

            if len(recent_ip) >= 20:
                retry_after = max(1, int(3600 - (now - recent_ip[0])) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Trop de tentatives depuis cette adresse IP. Veuillez réessayer plus tard.",
                    headers={"Retry-After": str(retry_after)},
                )

            # Record this attempt
            recent_ip_email.append(now)
            self._ip_email_attempts[ip_email_key] = recent_ip_email

            recent_ip.append(now)
            self._ip_attempts[norm_ip] = recent_ip

    def reset(self) -> None:
        """Useful for test suites."""
        with self._lock:
            self._ip_email_attempts.clear()
            self._ip_attempts.clear()

login_rate_limiter = LoginRateLimiter()

def get_client_ip(request: Request) -> str:
    """
    Extract client IP address. When uvicorn runs with --proxy-headers and trusted proxy,
    request.client.host is populated from X-Forwarded-For.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # First IP in list is the original client IP
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"
