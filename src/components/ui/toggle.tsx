"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-md text-button-14 whitespace-nowrap transition-[color,background-color,border-color,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none hover:bg-gray-alpha-100 hover:text-gray-1000 focus-visible:border-gray-600 focus-visible:ring-3 focus-visible:ring-gray-600/50 active:scale-[0.97] active:bg-gray-alpha-200 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-800 aria-invalid:ring-3 aria-invalid:ring-red-800/20 aria-pressed:bg-gray-alpha-200 aria-pressed:hover:bg-gray-alpha-300 motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-gray-alpha-400 bg-transparent hover:border-gray-alpha-500",
      },
      size: {
        default:
          "h-9 min-w-9 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        sm: "h-8 min-w-8 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        lg: "h-10 min-w-10 px-4 has-data-[icon=inline-end]:pe-3.5 has-data-[icon=inline-start]:ps-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
