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
  referee_id: z.string().min(1, "Sélectionnez un arbitre"),
  referee_function: z.string().min(1, "Sélectionnez une fonction"),
  indemnity: z.number().min(1, "L'indemnité doit être supérieure à 0"),
  indemnity_home: z.number().optional(),
  indemnity_away: z.number().optional(),
  paying_team_id: z.string().optional(),
});

const matchFormSchema = z
  .object({
    home_team_id: z.string().min(1, "Sélectionnez l'équipe à domicile"),
    away_team_id: z.string().min(1, "Sélectionnez l'équipe visiteuse"),
    date: z.string().min(1, "La date est requise"),
    time: z.string().min(1, "L'heure est requise"),
    city: z.string().min(1, "La ville est requise"),
    venue: z.string().min(1, "La salle est requise"),
    division: z.enum(["1DV", "2DV", "3DV"]),
    category: z.enum(["Seniors", "U19", "U16", "U14", "U12", "U10", "U8", "Men", "Women"]),
    gender: z.enum(["Homme", "Femme"]).optional().default("Homme"),
    assignments: z
      .array(refereeAssignmentSchema)
      .min(1, "Au moins un arbitre est requis"),
  })
  .refine((data) => data.home_team_id !== data.away_team_id, {
    message: "L'équipe visiteuse doit être différente de l'équipe à domicile",
    path: ["away_team_id"],
  })
  .refine(
    (data) => {
      const ids = data.assignments.map((a) => a.referee_id).filter(Boolean);
      return new Set(ids).size === ids.length;
    },
    {
      message: "Les arbitres en double ne sont pas autorisés",
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

const functionTranslations: Record<string, string> = {
  "1 er arbitre": "1 er arbitre",
  "2 ème arbitre": "2 ème arbitre",
  "1er arbitre": "1 er arbitre",
  "2ème arbitre": "2 ème arbitre",
  "Marqueur": "Marqueur",
  "Aide marqueur": "Aide marqueur",
  "Opérateur 24s": "Opérateur 24s",
  "Chronométreur": "Chronométreur",
  "Arbitre principal 1": "1 er arbitre",
  "Arbitre principal 2": "2 ème arbitre",
  "Main referee": "1 er arbitre",
  "Second referee": "2 ème arbitre",
  "Scorer": "Marqueur",
  "Timekeeper": "Chronométreur",
  "24s operator": "Opérateur 24s",
  "Arbitre principal": "1 er arbitre",
  "Second arbitre": "2 ème arbitre",
};

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
    indemnity_home: a.indemnity_home ?? a.indemnity,
    indemnity_away: a.indemnity_away ?? a.indemnity,
    paying_team_id: a.paying_team_id || "",
  })) || [
    {
      referee_id: activeReferees[0]?.id || "",
      referee_function: "1 er arbitre",
      indemnity: 400,
      indemnity_home: 400,
      indemnity_away: 400,
      paying_team_id: teams[0]?.id || "",
    },
    {
      referee_id: activeReferees[1]?.id || "",
      referee_function: "2 ème arbitre",
      indemnity: 300,
      indemnity_home: 300,
      indemnity_away: 300,
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
      city: initialData?.city || "",
      venue: initialData?.venue || "",
      division: (initialData?.division as MatchDivision) || "1DV",
      category: (initialData?.category as MatchCategory) || "Seniors",
      gender: (initialData?.gender as "Homme" | "Femme") || "Homme",
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
        assignments: pendingValues.assignments.map((a) => {
          const baseInd = Number(a.indemnity) || 0;
          return {
            referee_id: a.referee_id,
            referee_function: a.referee_function,
            indemnity: baseInd,
            indemnity_home: baseInd,
            indemnity_away: baseInd,
            paying_team_id: a.paying_team_id || pendingValues.home_team_id || teams[0]?.id || "",
          };
        }),
      });
      setShowConfirm(false);
    } catch (err: unknown) {
      setShowConfirm(false);
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement du match";
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
            <h2 className="text-[18px] font-semibold text-ink">Détails du match</h2>
          </div>

          <Field
            label="Équipe à domicile"
            htmlFor="home_team_id"
            error={errors.home_team_id?.message}
            required
          >
            <Select id="home_team_id" {...register("home_team_id")}>
              <option value="">Sélectionnez l'équipe à domicile</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Équipe visiteuse"
            htmlFor="away_team_id"
            error={errors.away_team_id?.message}
            required
          >
            <Select
              id="away_team_id"
              error={!!errors.away_team_id}
              {...register("away_team_id")}
            >
              <option value="">Sélectionnez l'équipe visiteuse</option>
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
              label="Heure"
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
              label="Ville"
              htmlFor="city"
              error={errors.city?.message}
              required
            >
              <Input id="city" {...register("city")} placeholder="ex. Ville" />
            </Field>

            <Field
              label="Salle"
              htmlFor="venue"
              error={errors.venue?.message}
              required
            >
              <Input id="venue" {...register("venue")} placeholder="ex. Salle omnisports" />
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
                    { value: "3DV", label: "3DV" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Catégorie" htmlFor="category" error={errors.category?.message} required>
              <Select id="category" {...register("category")}>
                <option value="Seniors">Seniors</option>
                <option value="U19">U19</option>
                <option value="U16">U16</option>
                <option value="U14">U14</option>
                <option value="U12">U12</option>
                <option value="U10">U10</option>
                <option value="U8">U8</option>
              </Select>
            </Field>

            <Field label="Sexe">
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <SegmentedControl<"Homme" | "Femme">
                    options={[
                      { value: "Homme", label: "Homme" },
                      { value: "Femme", label: "Femme" },
                    ]}
                    value={field.value || "Homme"}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
          </div>
        </div>

        {/* Referees Section */}
        <div ref={refereesSectionRef} className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h2 className="text-[18px] font-semibold text-ink">Arbitres</h2>
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
                      Officiel {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-[13px] text-danger hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>

                  {/* Search filter for referee selection */}
                  {activeReferees.length > 4 && (
                    <div className="relative">
                      <Input
                        placeholder="Rechercher par nom ou numéro de licence..."
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
                    label="Arbitre"
                    error={fieldError?.referee_id?.message}
                    required
                  >
                    <Select {...register(`assignments.${index}.referee_id`)}>
                      <option value="">Sélectionnez un officiel</option>
                      {filteredRefs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.license_number})
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Fonction"
                      error={fieldError?.referee_function?.message}
                      required
                    >
                      <Select {...register(`assignments.${index}.referee_function`)}>
                        <option value="1 er arbitre">1 er arbitre</option>
                        <option value="2 ème arbitre">2 ème arbitre</option>
                        <option value="Marqueur">Marqueur</option>
                        <option value="Aide marqueur">Aide marqueur</option>
                        <option value="Opérateur 24s">Opérateur 24s</option>
                        <option value="Chronométreur">Chronométreur</option>
                      </Select>
                    </Field>

                    <Field
                      label="Indemnité par équipe (MAD)"
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

                  <div className="rounded-[8px] bg-canvas/60 p-2.5 text-[12px] text-ink-muted flex items-center justify-between border border-line/60">
                    <span>Répartition des frais :</span>
                    <span className="font-medium text-ink">
                      2 reçus générés
                    </span>
                  </div>
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
                referee_function: "2 ème arbitre",
                indemnity: 300,
                paying_team_id: homeTeamId || teams[0]?.id || "",
              })
            }
          >
            <Plus size={16} strokeWidth={1.75} className="mr-1.5" />
            Ajouter un arbitre
          </Button>

          {/* Total indemnities banner */}
          <div className="flex items-center justify-between p-3.5 bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <span className="text-[14px] font-medium text-ink">Total des indemnités</span>
            <span className="text-[18px] font-bold text-ink">
              {totalIndemnities} MAD
            </span>
          </div>
        </div>

        {/* Fixed bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-surface border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3 z-40 shadow-lg">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            loading={isLoading}
            disabled={isEdit && !isDirty}
          >
            {isEdit ? "Enregistrer les modifications" : "Créer le match et envoyer les convocations"}
          </Button>
        </div>
      </form>

      {/* Summary Sheet Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={isEdit ? "Confirmer les modifications" : "Récapitulatif du match"}
        subtitle={isEdit ? "Vérifiez les détails mis à jour" : "Vérifiez les désignations avant d'avertir les arbitres"}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-canvas p-4 rounded-[12px] border border-line flex flex-col gap-2.5">
            <h3 className="text-[16px] font-bold text-ink">
              {homeTeam?.name || "Domicile"} vs {awayTeam?.name || "Visiteur"}
            </h3>
            <div className="flex flex-col gap-1 text-[13px] text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} strokeWidth={1.75} />
                {watchedDate} à {watchedTime}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} strokeWidth={1.75} />
                {watchedVenue}, {watchedCity}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-[13px] font-semibold text-ink">Officiels désignés</h4>
            <div className="divide-y divide-line border border-line rounded-[12px] overflow-hidden bg-surface">
              {watchedAssignments.map((a, idx) => {
                const r = referees.find((ref) => ref.id === a.referee_id);
                const translatedFn = functionTranslations[a.referee_function] || a.referee_function;
                return (
                  <div key={idx} className="p-3 flex items-center justify-between text-[13px]">
                    <div>
                      <span className="font-semibold text-ink">{r?.name || "Arbitre"}</span>
                      <span className="text-ink-muted ml-1.5">({translatedFn})</span>
                    </div>
                    <span className="font-bold text-ink">{a.indemnity} MAD</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FFF1E8] border border-brand/20 rounded-[12px]">
            <span className="text-[13px] font-semibold text-brand">Total des indemnités</span>
            <span className="text-[16px] font-bold text-brand">{totalIndemnities} MAD</span>
          </div>

          <p className="text-[12px] text-ink-muted text-center">
            {watchedAssignments.length} convocation{watchedAssignments.length > 1 ? "s" : ""} sera envoyée{watchedAssignments.length > 1 ? "s" : ""}
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
            >
              Retour
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1"
              loading={isLoading}
              onClick={handleConfirmedSubmit}
            >
              {isEdit ? "Confirmer et enregistrer" : "Confirmer et envoyer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
