"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input, inputVariants } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Size = "sm" | "default" | "lg"
type Shape = NonNullable<VariantProps<typeof inputVariants>["shape"]>

const SizeContext = React.createContext<Size>("default")
const ShapeContext = React.createContext<Shape>("default")

function InputGroup({
  className,
  size = "default",
  variant = "default",
  shape = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof inputVariants> & { size?: Size }) {
  return (
    <SizeContext.Provider value={size}>
      <ShapeContext.Provider value={shape ?? "default"}>
        <div
          data-slot="input-group"
          data-size={size}
          role="group"
          className={cn(
            "group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border transition-[color,background-color,border-color] outline-none [--input-group-gap:--spacing(1.25)] [--input-group-inset:--spacing(3)] in-data-[slot=combobox-content]:focus-within:border-inherit has-[[data-slot][aria-invalid=true]]:border-red-800 has-[[data-slot][aria-invalid=true]]:bg-red-100 has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:flex-col data-[size=lg]:h-10 data-[size=lg]:[--input-group-gap:--spacing(1.75)] data-[size=lg]:[--input-group-inset:--spacing(4)] data-[size=sm]:h-8 data-[size=sm]:[--input-group-gap:--spacing(0.75)] [&:has(>textarea,>[data-align^=block])]:h-auto has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-1.5 has-[>[data-align=inline-start]]:[&>input]:ps-1.5",
            inputVariants({ variant }),
            shape === "rounded" &&
              "[&:not(:has(>textarea,>[data-align^=block]))]:rounded-full",
            className
          )}
          {...props}
        />
      </ShapeContext.Provider>
    </SizeContext.Provider>
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-label-14 text-gray-900 select-none group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-[min(var(--radius-sm),calc(6px*var(--radius-scale)))] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first ps-(--input-group-inset) has-[>button]:ps-(--input-group-gap) has-[>button[data-size$=sm]]:ps-[calc(var(--input-group-gap)-4px)] has-[>kbd]:ms-[-0.15rem]",
        "inline-end":
          "order-last pe-(--input-group-inset) has-[>button]:pe-(--input-group-gap) has-[>button[data-size$=sm]]:pe-[calc(var(--input-group-gap)-4px)] has-[>kbd]:me-[-0.15rem]",
        "block-start":
          "order-first w-full justify-start px-(--input-group-inset) pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-(--input-group-inset) pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva("flex items-center gap-2 text-button-14", {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-[min(var(--radius-md),calc(8px*var(--radius-scale)))] px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&>svg:not([class*='size-'])]:size-3.5",
      sm: "h-8 gap-1 rounded-[min(var(--radius-md),calc(10px*var(--radius-scale)))] px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
      "icon-xs":
        "size-6 rounded-[min(var(--radius-md),calc(8px*var(--radius-scale)))] p-0 has-[>svg]:p-0",
      "icon-sm":
        "size-8 rounded-[min(var(--radius-md),calc(10px*var(--radius-scale)))] p-0 has-[>svg]:p-0",
    },
    shape: {
      default: "",
      rounded: "rounded-full",
    },
  },
  defaultVariants: {
    size: "xs",
    shape: "default",
  },
})

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  shape,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset"
  }) {
  const inherited = React.useContext(ShapeContext)
  shape ??= inherited
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      shape={shape}
      className={cn(inputGroupButtonVariants({ size, shape }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-label-14 text-gray-900 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "variant" | "shape">) {
  return (
    <Input
      size={React.useContext(SizeContext)}
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent aria-invalid:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Textarea>, "variant">) {
  return (
    <Textarea
      size={React.useContext(SizeContext)}
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-2 aria-invalid:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
