"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CANONICAL_FIELD_LABELS } from "@/lib/mapping/contracts";
import type { CanonicalWorkOrderField } from "@/lib/mapping/contracts";

const FIELD_GROUPS: ReadonlyArray<{
  label: string;
  fields: readonly CanonicalWorkOrderField[];
}> = [
  { label: "Required IDs", fields: ["facility_id", "wo_id"] },
  {
    label: "Assets and locations",
    fields: [
      "asset_id",
      "asset_name",
      "location_id",
      "location_name",
      "asset_class",
      "asset_criticality",
    ],
  },
  {
    label: "Work orders",
    fields: [
      "wo_type",
      "priority",
      "status",
      "trade",
      "wo_title",
      "fault_description",
      "resolution_notes",
      "root_cause",
      "outcome",
      "parts_used",
      "visit_count",
      "statutory_flag",
      "linked_wo_id",
    ],
  },
  { label: "Costs", fields: ["cost_total", "cost_labour", "cost_parts"] },
  { label: "Dates", fields: ["reported_date", "completed_date"] },
];

interface MappingFieldComboboxProps {
  id: string;
  label: string;
  value: CanonicalWorkOrderField | null;
  className?: string;
  disabled?: boolean;
  onChange: (field: CanonicalWorkOrderField | null) => void;
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function MappingFieldCombobox({
  id,
  label,
  value,
  className,
  disabled = false,
  onChange,
}: MappingFieldComboboxProps) {
  const generatedId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return FIELD_GROUPS.map((group) => ({
      ...group,
      fields: group.fields.filter((field) => {
        const label = CANONICAL_FIELD_LABELS[field].toLocaleLowerCase();
        return !query || label.includes(query) || field.includes(query);
      }),
    })).filter((group) => group.fields.length > 0);
  }, [search]);

  const options = useMemo(
    () => [
      ...(search.trim() && !"not mapped".includes(search.trim().toLocaleLowerCase())
        ? []
        : [{ field: null, label: "Not mapped" }]),
      ...filteredGroups.flatMap((group) =>
        group.fields.map((field) => ({
          field,
          label: CANONICAL_FIELD_LABELS[field],
        })),
      ),
    ],
    [filteredGroups, search],
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 24);
    const spaceAbove = Math.max(0, rect.top - 24);
    const opensBelow = spaceBelow >= 96 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(
      64,
      Math.min(340, opensBelow ? spaceBelow : spaceAbove),
    );
    const top = opensBelow ? rect.bottom + 8 : rect.top - maxHeight - 8;

    setPosition({ top, left, width, maxHeight });
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 180);
  }, [clearCloseTimer]);

  const openPopover = useCallback(() => {
    if (disabled) return;
    clearCloseTimer();
    setSearch("");
    setActiveIndex(0);
    setIsOpen(true);
    requestAnimationFrame(updatePosition);
  }, [clearCloseTimer, disabled, updatePosition]);

  const closePopover = useCallback(
    (restoreFocus = false) => {
      clearCloseTimer();
      setIsOpen(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [clearCloseTimer],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !triggerRef.current?.contains(event.target) &&
        !dialogRef.current?.contains(event.target)
      ) {
        closePopover();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopover(true);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [closePopover, isOpen, updatePosition]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [clearCloseTimer],
  );

  const selectOption = (field: CanonicalWorkOrderField | null) => {
    onChange(field);
    closePopover(true);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && options[activeIndex]) {
      event.preventDefault();
      selectOption(options[activeIndex].field);
    }
  };

  const optionId = (field: CanonicalWorkOrderField | null) =>
    `${generatedId}-option-${field ?? "not-mapped"}`;

  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${generatedId}-dialog`}
        onClick={() => (isOpen ? closePopover() : openPopover())}
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#737b82] bg-white px-3 py-2 text-left text-sm text-app-ink transition-colors hover:bg-app-canvas active:bg-app-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">
          {value ? CANONICAL_FIELD_LABELS[value] : "Not mapped"}
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-app-muted" />
      </button>

      {isOpen && position && (
        <div
          ref={dialogRef}
          id={`${generatedId}-dialog`}
          role="dialog"
          aria-label={`Choose ${label.toLocaleLowerCase()}`}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          onBlur={(event) => {
            if (!dialogRef.current?.contains(event.relatedTarget as Node | null)) {
              scheduleClose();
            }
          }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            zIndex: 50,
          }}
          className="overflow-hidden rounded-xl border border-app-line bg-white shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-app-line px-3">
            <label
              htmlFor={`${generatedId}-search`}
              className="shrink-0 text-xs font-medium text-app-muted"
            >
              Search
            </label>
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-app-muted" />
            <input
              id={`${generatedId}-search`}
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={`${generatedId}-listbox`}
              aria-activedescendant={
                options[activeIndex]
                  ? optionId(options[activeIndex].field)
                  : undefined
              }
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              placeholder="Search fields"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-app-ink outline-none placeholder:text-app-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent"
            />
          </div>

          <div
            id={`${generatedId}-listbox`}
            role="listbox"
            aria-label="Work-order fields"
            style={{ maxHeight: Math.max(40, position.maxHeight - 48) }}
            className="overflow-y-auto p-2"
          >
            {options.length === 0 ? (
              <p className="px-3 py-4 text-sm text-app-muted">No fields match that search.</p>
            ) : (
              <>
                {options[0]?.field === null && (
                  <div
                    id={optionId(null)}
                    role="option"
                    aria-selected={value === null}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(null)}
                    className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                      activeIndex === 0
                        ? "bg-app-canvas text-app-ink ring-2 ring-inset ring-app-accent"
                        : "text-app-muted"
                    }`}
                  >
                    Not mapped
                  </div>
                )}
                {filteredGroups.map((group) => {
                  const groupStartIndex = options.findIndex(
                    (option) => option.field === group.fields[0],
                  );
                  return (
                    <div
                      key={group.label}
                      role="group"
                      aria-label={group.label}
                      className="mt-2 first:mt-0"
                    >
                      <p className="px-3 py-1.5 text-xs font-semibold text-app-muted">
                        {group.label}
                      </p>
                      {group.fields.map((field, index) => {
                        const fieldOptionIndex = groupStartIndex + index;
                        const isRequired = field === "facility_id" || field === "wo_id";
                        return (
                          <div
                            key={field}
                            id={optionId(field)}
                            role="option"
                            aria-selected={value === field}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(fieldOptionIndex)}
                            onClick={() => selectOption(field)}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${
                              fieldOptionIndex === activeIndex
                                ? "bg-app-canvas text-app-ink ring-2 ring-inset ring-app-accent"
                                : "text-app-ink hover:bg-app-canvas"
                            }`}
                          >
                            <span>{CANONICAL_FIELD_LABELS[field]}</span>
                            {isRequired && (
                              <span className="shrink-0 text-xs text-app-muted">Required</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
