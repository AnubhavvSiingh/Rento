// Custom select dropdown with search and motion.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PremiumSelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  image?: string;
};

export function PremiumSelect({
  label,
  name,
  value,
  defaultValue,
  options,
  onChange,
  searchable = false,
  placeholder = "Choose an option",
  compact = false
}: {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string | number;
  options: PremiumSelectOption[];
  onChange?: (value: string) => void;
  searchable?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const selectId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const initialValue = String(value ?? defaultValue ?? options[0]?.value ?? "");
  const [internalValue, setInternalValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedValue = String(value ?? internalValue);
  const selectedOption = options.find((option) => option.value === selectedValue);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.description ?? ""}`.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(String(value));
    }
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function chooseOption(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div
      className={compact ? "premium-select compact" : "premium-select"}
      ref={rootRef}
      data-open={isOpen}
    >
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        type="button"
        className="premium-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${selectId}-label`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="premium-select-copy">
          <span className="premium-select-label" id={`${selectId}-label`}>
            {label}
          </span>
          <strong>{selectedOption?.label ?? placeholder}</strong>
          {selectedOption?.description && <small>{selectedOption.description}</small>}
        </span>
        <span className="premium-select-mark" aria-hidden="true">
          {selectedOption?.image ? (
            <span
              className="premium-select-image"
              style={{ backgroundImage: `url(${selectedOption.image})` }}
            />
          ) : (
            selectedOption?.icon ?? "v"
          )}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="premium-select-menu"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {searchable && (
              <input
                className="premium-select-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search options"
              />
            )}
            <div className="premium-select-list" role="listbox" aria-label={label}>
              {visibleOptions.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={isSelected ? "premium-select-option selected" : "premium-select-option"}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => chooseOption(option.value)}
                  >
                    <span className="premium-select-option-media" aria-hidden="true">
                      {option.image ? (
                        <span
                          className="premium-select-image"
                          style={{ backgroundImage: `url(${option.image})` }}
                        />
                      ) : (
                        option.icon ?? " "
                      )}
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      {option.description && <small>{option.description}</small>}
                    </span>
                    <span className="premium-select-check" aria-hidden="true">
                      {isSelected ? "*" : ""}
                    </span>
                  </button>
                );
              })}
              {visibleOptions.length === 0 && (
                <p className="premium-select-empty">No option matched.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
