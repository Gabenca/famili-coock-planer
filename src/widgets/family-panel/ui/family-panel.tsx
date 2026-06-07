import { ArrowLeft, Copy, UsersRound } from "lucide-react";
import React from "react";

import type { HouseholdMemberView } from "@/entities/household";

type InviteStatus = "accepted" | "ignored_existing_household" | "invalid" | "expired" | "none";

type FamilyAuthState =
  | { status: "checking" }
  | { status: "demo"; message: string }
  | {
      status: "ready";
      initData: string;
      household: {
        id: string;
        name: string;
        role: "owner" | "member";
      };
      inviteStatus: InviteStatus;
    }
  | { status: "error"; message: string };

type FamilyPanelProps = {
  authState: FamilyAuthState;
  members: HouseholdMemberView[];
  inviteMessage: string;
  inviteUrl: string;
  inviteLoading: boolean;
  onCreateInvite: () => void;
  onBack: () => void;
};

export function FamilyPanel({ authState, members, inviteMessage, inviteUrl, inviteLoading, onCreateInvite, onBack }: FamilyPanelProps) {
  const statusText = getAuthStatusText(authState);

  return (
    <section className="mt-5 space-y-3" aria-live="polite">
      <button type="button" className="flex h-10 items-center gap-2 rounded-md border border-ink/10 bg-paper px-3 text-sm font-extrabold text-ink" onClick={onBack} aria-label="Назад к приложению">
        <ArrowLeft size={16} />
        Назад
      </button>

      <section className="rounded-lg border border-ink/10 bg-paper p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-leaf">Пара</p>
            <h2 className="mt-1 text-2xl font-black text-ink">Семья</h2>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-clay text-paper" aria-hidden="true">
            <UsersRound size={22} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <FamilyRow label="Дом" value={statusText.title} />
          <FamilyRow label="Статус" value={statusText.description} />
          {statusText.warning ? <p className="rounded-md bg-honey/25 px-3 py-2 text-xs font-bold text-slate">{statusText.warning}</p> : null}
        </div>

        {authState.status === "ready" && members.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-black uppercase text-leaf">Участники</p>
            {members.map((member) => (
              <FamilyMemberRow key={member.id} member={member} />
            ))}
          </div>
        ) : null}
      </section>

      <InvitePanel authState={authState} inviteMessage={inviteMessage} inviteUrl={inviteUrl} inviteLoading={inviteLoading} onCreateInvite={onCreateInvite} />
    </section>
  );
}

function FamilyMemberRow({ member }: { member: HouseholdMemberView }) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || (member.username ? `@${member.username}` : "Участник");

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/55 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-ink">{name}</p>
        {member.username ? <p className="truncate text-xs font-semibold text-slate">@{member.username}</p> : null}
      </div>
      <span className="shrink-0 rounded-full bg-ink/5 px-2 py-1 text-xs font-black uppercase text-slate">{member.role === "owner" ? "владелец" : "участник"}</span>
    </div>
  );
}

function FamilyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/55 px-3 py-2">
      <span className="text-xs font-black uppercase text-leaf">{label}</span>
      <span className="min-w-0 truncate text-sm font-extrabold text-ink">{value}</span>
    </div>
  );
}

function InvitePanel({
  authState,
  inviteMessage,
  inviteUrl,
  inviteLoading,
  onCreateInvite
}: {
  authState: FamilyAuthState;
  inviteMessage: string;
  inviteUrl: string;
  inviteLoading: boolean;
  onCreateInvite: () => void;
}) {
  const statusText = getAuthStatusText(authState);

  return (
    <section className="mt-3 rounded-lg border border-ink/10 bg-white/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-ink">{statusText.title}</p>
          <p className="truncate text-xs font-semibold text-slate">{statusText.description}</p>
        </div>
        <button
          type="button"
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-extrabold text-paper disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onCreateInvite}
          disabled={inviteLoading}
          aria-label="Создать ссылку приглашения"
        >
          <Copy size={16} />
          {inviteLoading ? "..." : "Пригласить"}
        </button>
      </div>
      {statusText.warning ? <p className="mt-2 rounded-md bg-honey/25 px-2 py-1 text-xs font-bold text-slate">{statusText.warning}</p> : null}
      {inviteMessage ? <p className="mt-2 text-xs font-bold text-leaf">{inviteMessage}</p> : null}
      {inviteUrl ? <p className="mt-1 truncate text-xs font-semibold text-slate">{inviteUrl}</p> : null}
    </section>
  );
}

function getAuthStatusText(authState: FamilyAuthState) {
  if (authState.status === "checking") {
    return {
      title: "Проверяем Telegram",
      description: "Синхронизация пары",
      warning: ""
    };
  }

  if (authState.status === "ready") {
    const inviteWarnings: Record<InviteStatus, string> = {
      accepted: "Вы присоединились к паре по приглашению",
      ignored_existing_household: "Приглашение не применено: вы уже в паре",
      invalid: "Приглашение недействительно, создана новая пара",
      expired: "Приглашение истекло, создана новая пара",
      none: ""
    };

    return {
      title: authState.household.name,
      description: authState.household.role === "owner" ? "Вы владелец пары" : "Вы участник пары",
      warning: inviteWarnings[authState.inviteStatus]
    };
  }

  return {
    title: authState.message,
    description: "Данные сохраняются только на этом устройстве",
    warning: ""
  };
}
