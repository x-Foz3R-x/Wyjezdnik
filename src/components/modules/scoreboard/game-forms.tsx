"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function ChallengeForm({
  allowTeams,
  usesPoints,
  onSubmit,
  onCreated,
  isLoading,
}: {
  allowTeams: boolean;
  usesPoints: boolean;
  onSubmit: (values: {
    title: string;
    description: string | null;
    points: number;
    audience: "individual" | "team" | "either";
  }) => Promise<boolean>;
  onCreated: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(10);
  const [audience, setAudience] = useState<"individual" | "team" | "either">(
    allowTeams ? "team" : "individual",
  );

  const submit = async () => {
    if (!title.trim() || isLoading) return;
    const created = await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      points: usesPoints ? points : 0,
      audience: allowTeams ? audience : "individual",
    });
    if (created) onCreated();
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Nazwa wyzwania"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Krótko opisz, co trzeba zrobić"
        rows={3}
      />
      {(usesPoints || allowTeams) && (
        <div className={allowTeams && usesPoints ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
          {usesPoints && (
            <Input
              label="Punkty"
              type="number"
              min={0}
              max={100000}
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
            />
          )}
          {allowTeams && (
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="text-theme-muted">Kto podejmuje</span>
              <Select
                value={audience}
                onValueChange={(value) => setAudience(value as typeof audience)}
              >
                <SelectTrigger className="bg-theme-card border-theme-border h-12 w-full rounded-[var(--theme-radius-control)] px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Drużyna</SelectItem>
                  <SelectItem value="individual">Osoba</SelectItem>
                  <SelectItem value="either">Osoba lub drużyna</SelectItem>
                </SelectContent>
              </Select>
            </label>
          )}
        </div>
      )}
      <Button type="button" disabled={!title.trim() || isLoading} onClick={() => void submit()}>
        {isLoading ? "Dodawanie..." : "Dodaj wyzwanie"}
      </Button>
    </div>
  );
}

export function PollForm({
  onSubmit,
  onCreated,
  isLoading,
}: {
  onSubmit: (values: { question: string; options: string[] }) => Promise<boolean>;
  onCreated: () => void;
  isLoading: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const updateOption = (index: number, value: string) => {
    setOptions((current) =>
      current.map((option, optionIndex) => (optionIndex === index ? value : option)),
    );
  };

  const submit = async () => {
    const preparedOptions = options.map((option) => option.trim()).filter(Boolean);
    if (!question.trim() || preparedOptions.length < 2 || isLoading) return;
    const created = await onSubmit({ question: question.trim(), options: preparedOptions });
    if (created) onCreated();
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Pytanie"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        maxLength={240}
      />
      <p className="text-theme-muted -mt-2 text-right text-[10px]">{question.length}/240</p>
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-theme-muted w-5 text-center text-xs font-bold">{index + 1}</span>
            <Input
              aria-label={`Odpowiedź ${index + 1}`}
              value={option}
              placeholder="Odpowiedź"
              onChange={(event) => updateOption(index, event.target.value)}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() =>
                  setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                className="text-theme-muted h-10 w-8 text-lg"
                aria-label="Usuń odpowiedź"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button
          type="button"
          onClick={() => setOptions((current) => [...current, ""])}
          className="text-theme-primary flex items-center gap-2 self-start text-xs font-bold"
        >
          <Plus size={14} /> Dodaj odpowiedź
        </button>
      )}
      <Button
        type="button"
        disabled={
          !question.trim() || options.filter((option) => option.trim()).length < 2 || isLoading
        }
        onClick={() => void submit()}
        className="mt-2"
      >
        {isLoading ? "Tworzenie..." : "Uruchom głosowanie"}
      </Button>
    </div>
  );
}
