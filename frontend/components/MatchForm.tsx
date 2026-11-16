"use client";

import React, { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar } from "lucide-react";
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
import { ConfirmDialog } from "./ui/ConfirmDialog";

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

  const defaultAssignments = initialData?.assignments?.map((a) => ({
    referee_id: a.referee_id,
    referee_function: a.referee_function,
    indemnity: a.indemnity,
    paying_team_id: a.paying_team_id,
  })) || [
    {
      referee_id: referees[0]?.id || "",
      referee_function: "Main referee",
      indemnity: 400,
      paying_team_id: teams[0]?.id || "",
    },
    {
      referee_id: referees[1]?.id || "",
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
    formState: { errors },
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema) as never,
    defaultValues: {
      home_team_id: initialData?.home_team_id || teams[0]?.id || "",
      away_team_id: initialData?.away_team_id || teams[1]?.id || "",
      date: initialData?.date || "2026-11-22",
      time: initialData?.time || "18:30",
      city: initialData?.city || "Casablanca",
      venue: initialData?.venue || "Salle Mohammed V",
      division: initialData?.division || "1DV",
      category: initialData?.category || "Men",
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

  const totalIndemnities = watchedAssignments.reduce(
    (sum, a) => sum + (Number(a.indemnity) || 0),
    0
  );

  const onPreSubmit = (values: MatchFormData) => {
    setPendingValues(values);
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!pendingValues) return;
    await onSubmit({
      ...pendingValues,
      assignments: pendingValues.assignments.map((a) => ({
        ...a,
        indemnity: Number(a.indemnity),
      })),
    });
    setShowConfirm(false);
  };

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  return (
    <>
      <form onSubmit={handleSubmit(onPreSubmit)} className="flex flex-col gap-6 pb-28">
        {/* Match Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand" />
            <h2 className="text-[18px] font-semibold text-ink">Match</h2>
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
        <div className="flex flex-col gap-4 pt-2">
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

          <div className="flex flex-col gap-3">
            {fields.map((item, index) => {
              const fieldError = errors.assignments?.[index];

              return (
                <Card key={item.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-ink">
                      Referee {index + 1}
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

                  <Field
                    label="Referee"
                    error={fieldError?.referee_id?.message}
                    required
                  >
                    <Select {...register(`assignments.${index}.referee_id`)}>
                      <option value="">Select official</option>
                      {referees.map((r) => (
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
                paying_team_id: teams[0]?.id || "",
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

        {/* Sticky action bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-surface border-t border-line p-4 flex items-center gap-3 z-30">
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
          >
            Create match & assign
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog / Sheet (Screen 12) */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        title="Create this match?"
        subtitle="Please review the summary before confirming"
        confirmLabel="Create and notify referees"
        cancelLabel="Back"
        isLoading={isLoading}
      >
        <div className="bg-canvas p-4 rounded-[12px] border border-line flex flex-col gap-2">
          <h4 className="text-[16px] font-bold text-ink">
            {homeTeam?.name || "Home"} vs {awayTeam?.name || "Away"}
          </h4>
          <div className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Calendar size={15} strokeWidth={1.75} />
            <span>
              {watchedDate} {watchedTime} • {watchedVenue}
            </span>
          </div>
          <div className="text-[13px] text-ink font-medium mt-1">
            {watchedAssignments.length} referees, {totalIndemnities} MAD total
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};
