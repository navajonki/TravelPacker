import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Root Dialog component
const SideDialog = DialogPrimitive.Root

// Dialog Trigger component
const SideDialogTrigger = DialogPrimitive.Trigger

// Dialog Close component
const SideDialogClose = DialogPrimitive.Close

// Overlay component
const SideDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
SideDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Content component that shows on the right side
const SideDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SideDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed right-0 top-0 z-50 flex h-full flex-col border-l bg-background shadow-lg",
        "w-full max-w-xs sm:max-w-sm md:max-w-md lg:w-1/4",
        "translate-x-0 transition-all duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      <div className="p-6 overflow-y-auto flex-1">
        {children}
      </div>
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SideDialogContent.displayName = DialogPrimitive.Content.displayName

// Header component
const SideDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mb-4 flex flex-col space-y-1.5 text-left",
      className
    )}
    {...props}
  />
)
SideDialogHeader.displayName = "SideDialogHeader"

// Footer component
const SideDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SideDialogFooter.displayName = "SideDialogFooter"

// Title component
const SideDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
SideDialogTitle.displayName = DialogPrimitive.Title.displayName

// Description component
const SideDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SideDialogDescription.displayName = DialogPrimitive.Description.displayName

// Export all components
export {
  SideDialog,
  SideDialogTrigger,
  SideDialogClose,
  SideDialogContent,
  SideDialogHeader,
  SideDialogFooter,
  SideDialogTitle,
  SideDialogDescription,
}