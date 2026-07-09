import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function ProductCardSkeleton() {
  return (
    <Card className="h-full flex flex-col group overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-100 hover:border-primary/20">
      <CardHeader className="p-0 relative">
        <Skeleton className="w-full aspect-[4/3] rounded-t-xl" />
        <Skeleton className="absolute top-2 right-2 w-8 h-8 rounded-full" />
      </CardHeader>
      
      <CardContent className="flex-grow p-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/4 mt-auto" />
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex flex-col gap-3">
        <div className="flex items-center justify-between w-full">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-5 w-1/4" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
}
