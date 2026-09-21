import { useState } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { errorMessage } from "../../services/api";
import { workflowService } from "../../services/workflowService";

export default function ActionDialog({ config, onClose, onDone }) {
  const [values, setValues] = useState(
    Object.fromEntries(
      config.fields.map((field) => [
        field.name,
        field.value ?? field.options?.[0]?.value ?? "",
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (config.action === "__upload") {
        await workflowService.upload(values.batch, config.file, values.purpose);
      } else {
        await workflowService.act(config.action, config.build(values));
      }
      onDone();
    } catch (requestError) {
      const details = requestError.response?.data?.errors
        ?.map((item) => ` ${item.field}: ${item.message}`)
        .join("");
      setError(errorMessage(requestError) + (details || ""));
    } finally {
      setBusy(false);
    }
  }

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function renderField(field) {
    if (field.type === "multiselect") {
      return (
        <label className="field" key={field.name}>
          {field.label}
          <select
            aria-label={field.label}
            multiple
            value={String(values[field.name] || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)}
            onChange={(event) =>
              update(
                field.name,
                Array.from(
                  event.target.selectedOptions,
                  (option) => option.value,
                ).join(","),
              )
            }
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <small>Optional. Select files uploaded for this batch.</small>
        </label>
      );
    }
    if (field.type === "select") {
      return (
        <Select
          key={field.name}
          label={field.label}
          value={values[field.name]}
          required={field.required !== false}
          onChange={(event) => update(field.name, event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    }
    if (field.type === "textarea") {
      return (
        <label className="field" key={field.name}>
          {field.label}
          <textarea
            aria-label={field.label}
            required={field.required !== false}
            value={values[field.name]}
            rows={3}
            onChange={(event) => update(field.name, event.target.value)}
          />
        </label>
      );
    }
    return (
      <Input
        key={field.name}
        label={field.label}
        type={field.type || "text"}
        required={field.required !== false}
        min={field.min}
        max={field.max}
        value={values[field.name]}
        hint={field.hint}
        onChange={(event) => update(field.name, event.target.value)}
      />
    );
  }

  return (
    <Modal title={config.title} onClose={busy ? () => {} : onClose}>
      <p className="proposal-note">PROPOSED — TO BE VALIDATED WITH IMD.</p>
      {config.description && <p className="muted mb-4">{config.description}</p>}
      <form onSubmit={submit} className="workflow-form">
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        {config.fields.map(renderField)}
        <div className="modal-actions">
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Confirm action
          </Button>
        </div>
      </form>
    </Modal>
  );
}
