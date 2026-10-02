"use client";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export const FileUpload = ({
  onChange,
  accept,
  disabled = false,
  title = "Upload file",
  description = "Drag or drop your files here or click to upload",
}: {
  onChange?: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  title?: string;
  description?: string;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    if (disabled || newFiles.length === 0) return;
    setFiles(newFiles.slice(0, 1));
    onChange?.(newFiles.slice(0, 1));
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    disabled,
    onDrop: handleFileChange,
    onDropRejected: () => {
      // Parent validation surfaces a readable error.
    },
  });

  return (
    <div
      className={cn("w-full", disabled && "pointer-events-none opacity-60")}
      {...getRootProps()}
    >
      <motion.div
        onClick={handleClick}
        whileHover={disabled ? undefined : "animate"}
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-lg p-8 sm:p-10"
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans text-base font-bold text-[var(--color-ink)]">
            {title}
          </p>
          <p className="relative z-20 mt-2 max-w-md text-center font-sans text-sm font-normal text-[var(--color-ink-muted)] sm:text-base">
            {description}
          </p>
          <div className="relative mx-auto mt-10 w-full max-w-xl">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative z-40 mx-auto mt-4 flex w-full flex-col items-start justify-start overflow-hidden rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(13,21,38,0.92)] p-4 md:h-24",
                    "shadow-sm",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="max-w-xs truncate text-base text-[var(--color-ink)]"
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="w-fit shrink-0 rounded-lg bg-[rgba(34,211,238,0.12)] px-2 py-1 text-sm text-cyan-200"
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div className="mt-2 flex w-full flex-col items-start justify-between text-sm text-[var(--color-ink-muted)] md:flex-row md:items-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded-md bg-[rgba(7,11,20,0.65)] px-1 py-0.5"
                    >
                      {file.type || "image"}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      modified{" "}
                      {new Date(file.lastModified).toLocaleDateString()}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative z-40 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(13,21,38,0.95)] group-hover/file:shadow-[0_12px_40px_rgba(34,211,238,0.14)]",
                  "shadow-[0px_10px_50px_rgba(0,0,0,0.28)]",
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center text-cyan-200"
                  >
                    Drop it
                    <IconUpload className="h-4 w-4 text-cyan-300" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-4 w-4 text-cyan-300" />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute inset-0 z-30 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md border border-dashed border-cyan-400/70 bg-transparent opacity-0"
              ></motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex shrink-0 scale-105 flex-wrap items-center justify-center gap-x-px gap-y-px bg-[rgba(7,11,20,0.85)]">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`flex h-10 w-10 shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-[rgba(13,21,38,0.9)]"
                  : "bg-[rgba(13,21,38,0.9)] shadow-[0px_0px_1px_3px_rgba(0,0,0,0.55)_inset]"
              }`}
            />
          );
        }),
      )}
    </div>
  );
}
