import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Truck,
  Wheat,
  ShieldCheck,
  Warehouse,
  BookOpen,
  CalendarClock,
  Factory,
  Package,
  PackageCheck,
  Send,
  PackageOpen,
  QrCode,
  Search,
  AlertTriangle,
  Trash2,
  Undo2,
  ScrollText,
  FileBarChart,
  Leaf,
  Workflow,
  ClipboardList,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const operations = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Company Setup", url: "/company", icon: Building2 },
];

const workflows = [
  { title: "My Workflows", url: "/workflows", icon: ClipboardList },
  { title: "Workflow Templates", url: "/workflow-templates", icon: Workflow },
];

const supply = [
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Raw Materials", url: "/raw-materials", icon: Wheat },
  { title: "Quality Control", url: "/quality-control", icon: ShieldCheck },
  { title: "Storage", url: "/storage", icon: Warehouse },
];

const production = [
  { title: "Recipes / BOM", url: "/recipes", icon: BookOpen },
  { title: "Production Planning", url: "/production-planning", icon: CalendarClock },
  { title: "Production Batches", url: "/production-batches", icon: Factory },
  { title: "Packaging", url: "/packaging", icon: Package },
  { title: "Finished Goods", url: "/finished-goods", icon: PackageCheck },
];

const distribution = [
  { title: "Dispatch", url: "/dispatch", icon: Send },
  { title: "Customer Receiving", url: "/customer-receiving", icon: PackageOpen },
  { title: "Product Verification", url: "/verify", icon: QrCode },
];

const compliance = [
  { title: "Traceability Search", url: "/traceability", icon: Search },
  { title: "Recall Management", url: "/recalls", icon: AlertTriangle },
  { title: "Waste & Loss", url: "/waste", icon: Trash2 },
  { title: "Returns", url: "/returns", icon: Undo2 },
  { title: "Audit Trail", url: "/audit", icon: ScrollText },
  { title: "Reports", url: "/reports", icon: FileBarChart },
];

function Section({ label, items, currentPath }: { label: string; items: typeof operations; currentPath: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = currentPath === item.url;
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active}>
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">AgroTrace</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Traceability Suite
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Section label="Overview" items={operations} currentPath={currentPath} />
        <Section label="Workflows" items={workflows} currentPath={currentPath} />
        <Section label="Supply Chain" items={supply} currentPath={currentPath} />
        <Section label="Production" items={production} currentPath={currentPath} />
        <Section label="Distribution" items={distribution} currentPath={currentPath} />
        <Section label="Compliance" items={compliance} currentPath={currentPath} />
      </SidebarContent>
    </Sidebar>
  );
}
