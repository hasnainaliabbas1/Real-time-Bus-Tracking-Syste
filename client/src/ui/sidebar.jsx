import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

const SidebarContext = React.createContext({})

const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

const SidebarProvider = React.forwardRef((props, ref) => {
  const {
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...rest
  } = props

  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [open, setOpen] = React.useState(() => {
    if (typeof openProp !== "undefined") return openProp
    return defaultOpen
  })

  React.useEffect(() => {
    if (typeof openProp !== "undefined") {
      setOpen(openProp)
    }
  }, [openProp])

  React.useEffect(() => {
    if (setOpenProp) {
      setOpenProp(open)
    }

    document.cookie = `${SIDEBAR_COOKIE_NAME}=${open ? "expanded" : "collapsed"}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  }, [setOpenProp, open])

  const toggleSidebar = React.useCallback(() => {
    return isMobile
      ? setOpenMobile((open) => !open)
      : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo(() => ({
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
  }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar])

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          style={{
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          }}
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full text-sidebar-foreground has-[[data-variant=inset]]:bg-sidebar",
            className
          )}
          ref={ref}
          {...rest}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
})

SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef((props, ref) => {
  const {
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    className,
    children,
    ...rest
  } = props

  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        className={cn(
          "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
        ref={ref}
        {...rest}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...rest}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={{
            "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
          }}
          side={side}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={ref}
      className="group peer hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
    >
      <div
        className={cn(
          "duration-200 relative h-svh w-[--sidebar-width] bg-transparent transition-[width] ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
        )}
      />
      <div
        className={cn(
          "duration-200 fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...rest}
      >
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
        >
          {children}
        </div>
      </div>
    </div>
  )
})

Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef((props, ref) => {
  const { className, onClick, ...rest } = props
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...rest}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})

SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef((props, ref) => {
  const { className, ...rest } = props
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...rest}
    />
  )
})

SidebarRail.displayName = "SidebarRail"

const sidebarHeaderVariants = cva(
  "flex h-[var(--header-height)] flex-shrink-0 items-center gap-2 border-b border-sidebar-border px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
  {
    variants: {
      size: {
        sm: "h-12",
        md: "h-14",
        lg: "h-16",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const SidebarHeader = React.forwardRef((props, ref) => {
  const { className, size, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn(sidebarHeaderVariants({ size }), className)}
      {...rest}
    />
  )
})

SidebarHeader.displayName = "SidebarHeader"

const SidebarBody = React.forwardRef((props, ref) => {
  const { className, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="body"
      className={cn("flex-1 overflow-auto", className)}
      {...rest}
    />
  )
})

SidebarBody.displayName = "SidebarBody"

const SidebarFooter = React.forwardRef((props, ref) => {
  const { className, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn(
        "flex h-[var(--footer-height)] flex-shrink-0 items-center gap-2 border-t border-sidebar-border px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
        className
      )}
      {...rest}
    />
  )
})

SidebarFooter.displayName = "SidebarFooter"

const SidebarSearch = React.forwardRef((props, ref) => {
  const { className, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="search"
      className={cn("px-4 group-data-[collapsible=icon]:px-2", className)}
    >
      <Input
        ref={ref}
        type="search"
        placeholder="Search..."
        className="h-9"
        {...rest}
      />
    </div>
  )
})

SidebarSearch.displayName = "SidebarSearch"

const SidebarSection = React.forwardRef((props, ref) => {
  const { className, children, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="section"
      className={cn("px-4 group-data-[collapsible=icon]:px-2", className)}
      {...rest}
    >
      {children}
    </div>
  )
})

SidebarSection.displayName = "SidebarSection"

const SidebarSectionHeader = React.forwardRef((props, ref) => {
  const { className, children, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="section-header"
      className={cn(
        "flex items-center gap-2 py-2 group-data-[collapsible=icon]:justify-center",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
})

SidebarSectionHeader.displayName = "SidebarSectionHeader"

const SidebarSectionTitle = React.forwardRef((props, ref) => {
  const { className, children, ...rest } = props

  return (
    <h3
      ref={ref}
      data-sidebar="section-title"
      className={cn(
        "text-xs font-medium text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden",
        className
      )}
      {...rest}
    >
      {children}
    </h3>
  )
})

SidebarSectionTitle.displayName = "SidebarSectionTitle"

const SidebarItem = React.forwardRef((props, ref) => {
  const { asChild, className, children, ...rest } = props
  const Comp = asChild ? Slot : "div"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Comp
          ref={ref}
          data-sidebar="item"
          className={cn(
            "group/sidebar-item relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-item hover:text-sidebar-foreground focus-visible:bg-sidebar-item focus-visible:text-sidebar-foreground focus-visible:outline-none",
            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5",
            className
          )}
          {...rest}
        >
          {children}
        </Comp>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="hidden group-data-[collapsible=icon]:block"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
})

SidebarItem.displayName = "SidebarItem"

const SidebarItemIcon = React.forwardRef((props, ref) => {
  const { className, children, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="item-icon"
      className={cn(
        "flex h-5 w-5 items-center justify-center",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
})

SidebarItemIcon.displayName = "SidebarItemIcon"

const SidebarItemText = React.forwardRef((props, ref) => {
  const { className, children, ...rest } = props

  return (
    <span
      ref={ref}
      data-sidebar="item-text"
      className={cn(
        "flex-1 truncate text-sm group-data-[collapsible=icon]:hidden",
        className
      )}
      {...rest}
    >
      {children}
    </span>
  )
})

SidebarItemText.displayName = "SidebarItemText"

const SidebarItemIndicator = React.forwardRef((props, ref) => {
  const { className, children, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="item-indicator"
      className={cn(
        "ml-auto group-data-[collapsible=icon]:hidden",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
})

SidebarItemIndicator.displayName = "SidebarItemIndicator"

const SidebarItemSkeleton = React.forwardRef((props, ref) => {
  const { className, ...rest } = props

  return (
    <div
      ref={ref}
      data-sidebar="item-skeleton"
      className={cn("px-2 py-1.5", className)}
      {...rest}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 shrink-0" />
        <Skeleton className="h-4 w-[80%] group-data-[collapsible=icon]:hidden" />
      </div>
    </div>
  )
})

SidebarItemSkeleton.displayName = "SidebarItemSkeleton"

export {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarItemIcon,
  SidebarItemIndicator,
  SidebarItemSkeleton,
  SidebarItemText,
  SidebarProvider,
  SidebarRail,
  SidebarSearch,
  SidebarSection,
  SidebarSectionHeader,
  SidebarSectionTitle,
  SidebarTrigger,
  useSidebar,
}
