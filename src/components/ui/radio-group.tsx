"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-gray-alpha-400 bg-background-100 transition-[border-color,box-shadow] outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-gray-alpha-500 focus-visible:border-gray-600 focus-visible:ring-3 focus-visible:ring-gray-600/50 aria-invalid:border-red-800 aria-invalid:bg-red-100 aria-invalid:ring-3 aria-invalid:ring-red-800/20 aria-invalid:aria-checked:border-gray-1000 aria-invalid:aria-checked:bg-gray-1000 data-checked:border-gray-1000 data-checked:bg-gray-1000 data-checked:text-background-100 data-checked:hover:border-gray-950 data-checked:hover:bg-gray-950 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background-100" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
