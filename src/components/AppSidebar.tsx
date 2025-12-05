import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Compass, Image, Video, Search } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/UserMenu";

const menuItems = [
  { title: "Chat", url: "/", icon: MessageSquare },
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "AI Search Pro", url: "/ai-search-pro", icon: Search },
  { title: "Image Generation", url: "/generate", icon: Image },
  { title: "Video AI", url: "/video-ai", icon: Video },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-2">
          <UserMenu />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
