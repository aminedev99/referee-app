"use client";

import React, { useState, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar, AlertCircle, MapPin, Search } from "lucide-react";
import {
  Match,
  Team,
  Referee,
  CreateMatchInput,
  MatchDivision,
  MatchCategory,
} from "@/lib/types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Field } from "./ui/Field";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";

const refereeAssignmentSchema = z.object({
  referee_id: z.string().min(1, "Select a referee"),
  referee_function: z.string().min(1, "Select function"),
  indemnity: z.number().min(1, "Indemnity must be greater than 0"),
  paying_team_id: z.string().min(1, "Select paying team"),
});

const matchFormSchema = z
  .object({
    home_team_id: z.string().min(1, "Select home team"),
    away_team_id: z.string().min(1, "Select away team"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    city: z.string().min(1, "City is required"),
    venue: z.string().min(1, "Venue is required"),
    division: z.enum(["1DV", "2DV"]),
    category: z.enum(["Men", "Women"]),
    assignments: z
      .array(refereeAssignmentSchema)
      .min(1, "At least one referee row is required"),
  })
  .refine((data) => data.home_team_id !== data.away_team_id, {
    message: "Away team must differ from home team",
    path: ["away_team_id"],
  })
  .refine(
    (data) => {
      const ids = data.assignments.map((a) => a.referee_id).filter(Boolean);
      return new Set(ids).size === ids.length;
    },
    {
      message: "Duplicate referees are not allowed",
      path: ["assignments"],
    }
  );

type MatchFormData = z.infer<typeof matchFormSchema>;

export interface MatchFormProps {
  initialData?: Match;
  teams: Team[];
  referees: Referee[];
  onSubmit: (data: CreateMatchInput) => Promise<void>;
  isLoading?: boolean;
}

export const MatchForm: React.FC<MatchFormProps> = ({
  initialData,
  teams,
  referees,
  onSubmit,
  isLoading = false,
}) => {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<MatchFormData | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [refSearch, setRefSearch] = useState<Record<number, string>>({});
  const refereesSectionRef = useRef<HTMLDivElement>(null);

  const isEdit = Boolean(initialData);

  // Filter to active referees only (or if initialData assignment has a referee, keep it)
  const activeReferees = referees.filter((r) => r.is_active !== false);

  const defaultAssignments = initialData?.assignments?.map((a) => ({
    referee_id: a.referee_id,
    referee_function: a.referee_function,
    indemnity: a.indemnity,
    paying_team_id: a.paying_team_id,
  })) || [
    {
      referee_id: activeReferees[0]?.id || "",
      referee_function: "Main referee",
      indemnity: 400,
      paying_team_id: teams[0]?.id || "",
    },
    {
      referee_id: activeReferees[1]?.id || "",
      referee_function: "Second referee",
      indemnity: 300,
      paying_team_id: teams[1]?.id || "",
    },
  ];

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema) as never,
    defaultValues: {
      home_team_id: initialData?.home_team_id || teams[0]?.id || "",
      away_team_id: initialData?.away_team_id || teams[1]?.id || "",
      date: initialData?.date || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      time: initialData?.time || "18:30",
      city: initialData?.city || "Casablanca",
      venue: initialData?.venue || "Salle Mohammed V",
      division: (initialData?.division as MatchDivision) || "1DV",
      category: (initialData?.category as MatchCategory) || "Men",
      assignments: defaultAssignments,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "assignments",
  });

  const watchedAssignments = watch("assignments") || [];
  const homeTeamId = watch("home_team_id");
  const awayTeamId = watch("away_team_id");
  const watchedDate = watch("date");
  const watchedTime = watch("time");
  const watchedVenue = watch("venue");
  const watchedCity = watch("city");

  const totalIndemnities = watchedAssignments.reduce(
    (sum, a) => sum + (Number(a.indemnity) || 0),
    0
  );

  const onError = (formErrors: typeof errors) => {
    // Scroll to the first error element
    const firstErrorKey = Object.keys(formErrors)[0];
    if (firstErrorKey) {
      const el = document.getElementById(firstErrorKey) || document.querySelector(`[name^="${firstErrorKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const onPreSubmit = (values: MatchFormData) => {
    setConflictError(null);
    setPendingValues(values);
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!pendingValues) return;
    try {
      setConflictError(null);
      await onSubmit({
        ...pendingValues,
        assignments: pendingValues.assignments.map((a) => ({
          ...a,
          indemnity: Number(a.indemnity),
        })),
      });
      setShowConfirm(false);
    } catch (err: unknown) {
      setShowConfirm(false);
      const msg = err instanceof Error ? err.message : "Failed to save match";
      setConflictError(msg);
      // Scroll to referees section where error banner is located
      refereesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  return (
    <>
      <form onSubmit={handleSubmit(onPreSubmit, onError)} className="flex flex-col gap-6 pb-28">
        {/* Match Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand" />
            <h2 className="text-[18px] font-semibold text-ink">Match details</h2>
          </div>

          <Field
            label="Home team"
            htmlFor="home_team_id"
            error={errors.home_team_id?.message}
            required
          >
            <Select id="home_team_id" {...register("home_team_id")}>
              <option value="">Select home team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Away team"
            htmlFor="away_team_id"
            error={errors.away_team_id?.message}
            required
          >
            <Select
              id="away_team_id"
              error={!!errors.away_team_id}
              {...register("away_team_id")}
            >
              <option value="">Select away team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Date"
              htmlFor="date"
              error={errors.date?.message}
              required
            >
              <Input
                id="date"
                type="date"
                {...register("date")}
              />
            </Field>

            <Field
              label="Time"
              htmlFor="time"
              error={errors.time?.message}
              required
            >
              <Input
                id="time"
                type="time"
                {...register("time")}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="City"
              htmlFor="city"
              error={errors.city?.message}
              required
            >
              <Input id="city" {...register("city")} placeholder="e.g. Casablanca" />
            </Field>

            <Field
              label="Venue"
              htmlFor="venue"
              error={errors.venue?.message}
              required
            >
              <Input id="venue" {...register("venue")} placeholder="e.g. Salle Mohammed V" />
            </Field>
          </div>

          <Field label="Division">
            <Controller
              control={control}
              name="division"
              render={({ field }) => (
                <SegmentedControl<MatchDivision>
                  options={[
                    { value: "1DV", label: "1DV" },
                    { value: "2DV", label: "2DV" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Category">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <SegmentedControl<MatchCategory>
                  options={[
                    { value: "Men", label: "Men" },
                    { value: "Women", label: "Women" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </div>

        {/* Referees Section */}
        <div ref={refereesSectionRef} className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h2 className="text-[18px] font-semibold text-ink">Referees</h2>
            </div>
            {errors.assignments && (
              <span className="text-[12px] text-danger">
                {errors.assignments.message ||
                  (errors.assignments.root && errors.assignments.root.message)}
              </span>
            )}
          </div>

          {/* Backend 409 conflict error banner */}
          {conflictError && (
            <div className="p-3.5 bg-danger-tint border border-danger/30 rounded-[12px] flex items-start gap-2.5 text-danger text-[13px] animate-fadeIn">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{conflictError}</div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {fields.map((item, index) => {
              const fieldError = errors.assignments?.[index];
              const searchFilter = (refSearch[index] || "").toLowerCase();
              const filteredRefs = activeReferees.filter(
                (r) =>
                  !searchFilter ||
                  r.name.toLowerCase().includes(searchFilter) ||
                  r.license_number.toLowerCase().includes(searchFilter)
              );

              return (
                <Card key={item.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-ink">
                      Official {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-[13px] text-danger hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Search filter for referee selection */}
                  {activeReferees.length > 4 && (
                    <div className="relative">
                      <Input
                        placeholder="Search referee by name or license..."
                        value={refSearch[index] || ""}
                        onChange={(e) =>
                          setRefSearch((prev) => ({ ...prev, [index]: e.target.value }))
                        }
                        leftIcon={<Search size={15} strokeWidth={1.75} />}
                        className="text-[13px] h-9"
                      />
                    </div>
                  )}

                  <Field
                    label="Referee"
                    error={fieldError?.referee_id?.message}
                    required
                  >
                    <Select {...register(`assignments.${index}.referee_id`)}>
                      <option value="">Select official</option>
                      {filteredRefs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.license_number})
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Function"
                      error={fieldError?.referee_function?.message}
                      required
                    >
                      <Select {...register(`assignments.${index}.referee_function`)}>
                        <option value="Main referee">Main referee</option>
                        <option value="Second referee">Second referee</option>
                        <option value="Scorer">Scorer</option>
                        <option value="Timekeeper">Timekeeper</option>
                        <option value="24s operator">24s operator</option>
                      </Select>
                    </Field>

                    <Field
                      label="Indemnity (MAD)"
                      error={fieldError?.indemnity?.message}
                      required
                    >
                      <Input
                        type="number"
                        min="1"
                        {...register(`assignments.${index}.indemnity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                  </div>

                  <Field
                    label="Paying team"
                    error={fieldError?.paying_team_id?.message}
                    required
                  >
                    <Select {...register(`assignments.${index}.paying_team_id`)}>
                      <option value="">Select paying team</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </Card>
              );
            })}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() =>
              append({
                referee_id: "",
                referee_function: "Second referee",
                indemnity: 300,
                paying_team_id: homeTeamId || teams[0]?.id || "",
              })
            }
          >
            <Plus size={16} strokeWidth={1.75} className="mr-1.5" />
            Add referee
          </Button>

          {/* Total indemnities banner */}
          <div className="flex items-center justify-between p-3.5 bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <span className="text-[14px] font-medium text-ink">Total indemnities</span>
            <span className="text-[18px] font-bold text-ink">
              {totalIndemnities} MAD
            </span>
          </div>
        </div>

        {/* Fixed bottom action bar (above safe area) */}
        <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-surface border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3 z-40 shadow-lg">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            loading={isLoading}
            disabled={isEdit && !isDirty}
          >
            {isEdit ? "Save changes" : "Create match and send invitations"}
          </Button>
        </div>
      </form>

      {/* Summary Sheet Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={isEdit ? "Confirm match changes" : "Create match summary"}
        subtitle={isEdit ? "Review updated match details" : "Review assignments before notifying referees"}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-canvas p-4 rounded-[12px] border border-line flex flex-col gap-2.5">
            <h3 className="text-[16px] font-bold text-ink">
              {homeTeam?.name || "Home"} vs {awayTeam?.name || "Away"}
            </h3>
            <div className="flex flex-col gap-1 text-[13px] text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} strokeWidth={1.75} />
                {watchedDate} at {watchedTime}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} strokeWidth={1.75} />
                {watchedVenue}, {watchedCity}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-[13px] font-semibold text-ink">Assigned Officials</h4>
            <div className="divide-y divide-line border border-line rounded-[12px] overflow-hidden bg-surface">
              {watchedAssignments.map((a, idx) => {
                const r = referees.find((ref) => ref.id === a.referee_id);
                return (
                  <div key={idx} className="p-3 flex items-center justify-between text-[13px]">
                    <div>
                      <span className="font-semibold text-ink">{r?.name || "Referee"}</span>
                      <span className="text-ink-muted ml-1.5">({a.referee_function})</span>
                    </div>
                    <span className="font-bold text-ink">{a.indemnity} MAD</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FFF1E8] border border-brand/20 rounded-[12px]">
            <span className="text-[13px] font-semibold text-brand">Total Indemnities</span>
            <span className="text-[16px] font-bold text-brand">{totalIndemnities} MAD</span>
          </div>

          <p className="text-[12px] text-ink-muted text-center">
            {watchedAssignments.length} invitation{watchedAssignments.length > 1 ? "s" : ""} will be sent
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1"
              loading={isLoading}
              onClick={handleConfirmedSubmit}
            >
              {isEdit ? "Confirm and save" : "Confirm and send"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
