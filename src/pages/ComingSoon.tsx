
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ComingSoonProps {
  title: string;
  description?: string;
}

const ComingSoon = ({ title, description }: ComingSoonProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground">
          {description || "This feature is coming soon!"}
        </p>
      </div>

      <Card className="fade-in">
        <CardContent className="text-center py-16">
          <Construction className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-4">Under Construction</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We're working hard to bring you this feature. It will include comprehensive functionality 
            for managing {title.toLowerCase()} with full CRUD operations and advanced features.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
