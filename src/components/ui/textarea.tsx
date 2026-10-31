import * as React from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { inputVariants } from "@/components/ui/input"

function Textarea({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"textarea"> &
  Pick<VariantProps<typeof inputVariants>, "variant"> & {
    size?: "sm" | "default" | "lg"
  }) {
  return (
    <textarea
      data-slot="textarea"
      data-size={size}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-copy-16 transition-[color,background-color,border-color] outline-none placeholder:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-800 aria-invalid:bg-red-100 data-[size=lg]:px-4 data-[size=lg]:py-2.5 data-[size=sm]:py-1.5 md:text-copy-14",
        inputVariants({ variant }),
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
