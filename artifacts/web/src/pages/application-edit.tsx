import { useEffect } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useUpdateApplication, 
  useGetApplication, 
  getGetApplicationQueryKey,
  ApplicationStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

const formSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  beneficialOwnerName: z.string().min(1, "Beneficial owner name is required"),
  ownershipPercentage: z.coerce.number().min(0, "Must be at least 0").max(100, "Cannot exceed 100"),
  changeReason: z.string().min(1, "Reason for change is required"),
  supportingNotes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ApplicationEdit() {
  const { id } = useParams();
  const applicationId = id ? parseInt(id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: application, isLoading } = useGetApplication(applicationId, {
    query: {
      enabled: !!applicationId,
      queryKey: getGetApplicationQueryKey(applicationId)
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      registrationNumber: "",
      beneficialOwnerName: "",
      ownershipPercentage: 0,
      changeReason: "",
      supportingNotes: "",
    },
  });

  useEffect(() => {
    if (application) {
      if (application.status !== ApplicationStatus.DRAFT) {
        toast({
          title: "Cannot edit",
          description: "Only draft applications can be edited.",
          variant: "destructive"
        });
        setLocation(`/applications/${applicationId}`);
        return;
      }

      form.reset({
        companyName: application.companyName,
        registrationNumber: application.registrationNumber,
        beneficialOwnerName: application.beneficialOwnerName,
        ownershipPercentage: application.ownershipPercentage,
        changeReason: application.changeReason,
        supportingNotes: application.supportingNotes || "",
      });
    }
  }, [application, form, applicationId, setLocation, toast]);

  const updateMutation = useUpdateApplication();

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { id: applicationId, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          toast({
            title: "Request Updated",
            description: "Your ownership change request has been updated.",
          });
          setLocation(`/applications/${applicationId}`);
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: err.message || "Failed to update request.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading || !application) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/applications/${applicationId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Change Request</h1>
          <p className="text-muted-foreground mt-1">{application.companyName} ({application.registrationNumber})</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company & Ownership Details</CardTitle>
          <CardDescription>Update the ownership information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="beneficialOwnerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Beneficial Owner Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownershipPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership Percentage (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="changeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Change</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supportingNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supporting Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Link href={`/applications/${applicationId}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Update Draft"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
