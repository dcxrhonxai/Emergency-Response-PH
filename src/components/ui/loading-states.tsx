import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({ message = "Loading...", className = "", size = "md" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-2`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className = "" }: EmptyStateProps) => (
  <Card className={`p-6 text-center ${className}`}>
    {icon && <div className="flex justify-center mb-3 text-muted-foreground/50">{icon}</div>}
    <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
    {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}
    {action}
  </Card>
);
