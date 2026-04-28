"use client";

import { useMutation } from "@tanstack/react-query";
import React from "react";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc";

type AssetKind = "product" | "brand" | "category" | "banner";

type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void | Promise<void>;
  isLoading?: boolean;
  isDisabled?: boolean;
  variant?: "flat" | "solid";
  size?: "sm" | "md";
  color?: "primary" | "danger" | string;
  as?: "a";
  href?: string;
};

type FieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

export function Button({ children, onPress, isLoading, isDisabled, variant, size, color, as, href }: ButtonProps) {
  const className = ["admin-button", variant === "flat" ? "soft" : "solid", size === "sm" ? "small" : "", color === "danger" ? "danger" : ""].filter(Boolean).join(" ");

  if (as === "a") {
    return <a className={className} href={href}>{children}</a>;
  }

  return (
    <button className={className} type="button" disabled={isDisabled || isLoading} onClick={() => void onPress?.()}>
      {isLoading ? "Working..." : children}
    </button>
  );
}

export function Chip({ children, color }: { children: React.ReactNode; color?: string; variant?: string }) {
  return <span className={["admin-chip", color ? `chip-${color}` : ""].filter(Boolean).join(" ")}>{children}</span>;
}

export function Input({ label, value, onValueChange, type = "text", placeholder, autoComplete, onKeyDown }: FieldProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onValueChange(event.target.value)} onKeyDown={onKeyDown} />
    </label>
  );
}

export function TextArea({ label, value, onValueChange, rows = 3 }: FieldProps & { rows?: number }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea value={value} rows={rows} onChange={(event) => onValueChange(event.target.value)} />
    </label>
  );
}

export function Switch({ children, isSelected, onValueChange }: { children: React.ReactNode; isSelected: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <label className="admin-switch">
      <input type="checkbox" checked={isSelected} onChange={(event) => onValueChange(event.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function Tab({ children }: { children?: React.ReactNode; title: string }) {
  return <>{children}</>;
}

export function Tabs({
  children,
  selectedKey,
  onSelectionChange,
}: {
  children: React.ReactNode;
  "aria-label"?: string;
  color?: string;
  selectedKey?: string;
  onSelectionChange?: (key: string) => void;
}) {
  const items = React.Children.toArray(children).filter(React.isValidElement) as Array<React.ReactElement<{ title: string; children?: React.ReactNode }>>;
  const firstKey = items[0]?.key ? String(items[0].key) : "";
  const [internalKey, setInternalKey] = useState(firstKey);
  const activeKey = selectedKey ?? internalKey;
  const activeItem = items.find((item) => String(item.key) === activeKey) ?? items[0];

  return (
    <div className="admin-tabs">
      <div className="tab-list">
        {items.map((item) => {
          const itemKey = String(item.key);
          return (
            <button
              className={itemKey === activeKey ? "tab-button active" : "tab-button"}
              key={itemKey}
              type="button"
              onClick={() => {
                setInternalKey(itemKey);
                onSelectionChange?.(itemKey);
              }}
            >
              {item.props.title}
            </button>
          );
        })}
      </div>
      {activeItem?.props.children ? <div className="tab-panel">{activeItem.props.children}</div> : null}
    </div>
  );
}

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
      </div>
      <div className="admin-section-body">{children}</div>
    </section>
  );
}

export function EmptyAdminState({ label }: { label: string }) {
  return <p className="muted empty-row">{label}</p>;
}

export function AssetUploadField({
  kind,
  value,
  onChange,
}: {
  kind: AssetKind;
  value: string;
  onChange: (assetId: string) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const createSignature = useMutation(trpc.assets.createUploadSignature.mutationOptions());
  const registerAsset = useMutation(
    trpc.assets.registerUploadedAsset.mutationOptions({
      async onSuccess(asset) {
        onChange(asset.id);
        setStatus(`Uploaded asset ${asset.id}`);
        await queryClient.invalidateQueries();
      },
    }),
  );

  async function uploadFile(file: File) {
    setStatus("Uploading...");
    const signature = await createSignature.mutateAsync({ kind });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("signature", signature.signature);
    formData.append("folder", signature.folder);
    formData.append("public_id", signature.publicId);

    const response = await fetch(signature.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      setStatus("Upload failed.");
      return;
    }

    const uploaded = (await response.json()) as {
      public_id: string;
      secure_url: string;
      width?: number;
      height?: number;
      format?: string;
      bytes?: number;
      folder?: string;
    };

    await registerAsset.mutateAsync({
      kind,
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      folder: uploaded.folder ?? signature.folder,
    });
  }

  return (
    <div className="asset-field">
      <Input label={`${kind} asset id`} value={value} onValueChange={onChange} placeholder="Upload or paste an asset id" />
      <label className="file-button">
        Upload {kind} image
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
      </label>
      {status ? <p className="muted small-text">{status}</p> : null}
    </div>
  );
}

export function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <TextArea label={label} value={value} onValueChange={onChange} rows={3} />;
}

export function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <Input label={label} type="number" value={String(value)} onValueChange={(next) => onChange(Number(next || 0))} />;
}

export function EntitySelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Array<{ id: string; label: string }>;
}) {
  return (
    <label className="native-select-label">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose...</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}
