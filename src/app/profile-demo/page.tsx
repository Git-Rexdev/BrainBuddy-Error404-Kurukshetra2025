"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserProfile from "@/components/user-profile";

const mockUser = {
  full_name: "John Doe",
  email: "john.doe@example.com",
  avatar_url: undefined, // Will use fallback
};

const mockUserWithAvatar = {
  full_name: "Jane Smith",
  email: "jane.smith@example.com",
  avatar_url: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
};

export default function ProfileDemoPage() {
  return (
    <div className="pt-6 max-w-4xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">User Profile Component Demo</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Showcasing different variants and states of the UserProfile component
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        {/* Default Variant */}
        <Card>
          <CardHeader>
            <CardTitle>Default Variant</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfile 
              user={mockUser}
              showLogout={true}
              showSettings={true}
              onLogout={() => alert("Logout clicked")}
              onSettings={() => alert("Settings clicked")}
            />
          </CardContent>
        </Card>

        {/* Compact Variant */}
        <Card>
          <CardHeader>
            <CardTitle>Compact Variant</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfile 
              user={mockUser}
              variant="compact"
            />
          </CardContent>
        </Card>

        {/* Minimal Variant */}
        <Card>
          <CardHeader>
            <CardTitle>Minimal Variant</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <UserProfile 
              user={mockUser}
              variant="minimal"
            />
          </CardContent>
        </Card>

        {/* With Avatar Image */}
        <Card>
          <CardHeader>
            <CardTitle>With Avatar Image</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfile 
              user={mockUserWithAvatar}
              showLogout={true}
              onLogout={() => alert("Logout clicked")}
            />
          </CardContent>
        </Card>

        {/* Loading State */}
        <Card>
          <CardHeader>
            <CardTitle>Loading State</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfile 
              user={mockUser}
              loading={true}
              showLogout={true}
              onLogout={() => alert("Logout clicked")}
            />
          </CardContent>
        </Card>

        {/* No User Data */}
        <Card>
          <CardHeader>
            <CardTitle>No User Data</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfile 
              user={null}
              showLogout={true}
              onLogout={() => alert("Logout clicked")}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Component Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Responsive Design:</strong> Adapts to different screen sizes and sidebar states</li>
            <li>• <strong>Loading States:</strong> Shows skeleton loaders while fetching user data</li>
            <li>• <strong>Fallback Handling:</strong> Gracefully handles missing user data and images</li>
            <li>• <strong>Multiple Variants:</strong> Default, compact, and minimal layouts</li>
            <li>• <strong>Accessibility:</strong> Proper ARIA labels and keyboard navigation</li>
            <li>• <strong>Consistent Styling:</strong> Uses design system tokens and components</li>
            <li>• <strong>Interactive Elements:</strong> Configurable logout and settings buttons</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
