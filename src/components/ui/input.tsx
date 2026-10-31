import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Shared by the field-style controls. Focus darkens the default border and
// leaves secondary and ghost as they rest; the caret shows it. A pill fits
// single-line fields only.
const inputVariants = cva("", {
  variants: {
    variant: {
      default:
        "border-gray-alpha-400 bg-background-100 focus-within:border-gray-800 not-focus-within:hover:border-gray-alpha-500",
      secondary:
        "border-transparent bg-gray-100 not-focus-within:hover:bg-gray-200",
      ghost: "border-transparent bg-transparent",
    },
    shape: {
      default: "",
      rounded: "rounded-full",
    },
  },
  defaultVariants: {
    variant: "default",
    shape: "default",
  },
})

function Input({
  className,
  type,
  size = "default",
  variant = "default",
  shape = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants> & {
    size?: "sm" | "default" | "lg"
  }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "h-9 w-full min-w-0 rounded-md border px-3 py-1 text-label-16 transition-[color,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-button-14 file:text-gray-1000 placeholder:text-gray-900 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-800 aria-invalid:bg-red-100 data-[size=lg]:h-10 data-[size=lg]:px-4 data-[size=sm]:h-8 md:text-label-14",
        inputVariants({ variant, shape }),
        className
      )}
      {...props}
    />
  )
}

export { Input, inputVariants }
