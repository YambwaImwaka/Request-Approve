import { useEffect, useRef } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateApplication,
  useGetApplication,
  getGetApplicationQueryKey,
  ApplicationStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { CATEGORY_VALUES, CATEGORY_LABELS } from "@/lib/category";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, AlertCircle, Paperclip, X } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(CATEGORY_VALUES, { message: "Category is required" }),
  companyName: z.string().min(1, "Company name is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  beneficialOwnerName: z.string().min(1, "Beneficial owner name is required"),
  ownershipPercentage: z
    .coerce.number()
    .min(0, "Must be at least 0")
    .max(100, "Cannot exceed 100"),
  effectiveDate: z.string().optional(),
  changeReason: z.string().min(1, "Reason for change is required"),
  supportingNotes: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ApplicationEdit() {
  const { id } = useParams();
  const applicationId = id ? parseInt(id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useUpload();

  const { data: application, isLoading } = useGetApplication(applicationId, {
    query: {
      enabled: !!applicationId,
      queryKey: getGetApplicationQueryKey(applicationId),
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: undefined,
      companyName: "",
      registrationNumber: "",
      beneficialOwnerName: "",
      ownershipPercentage: 0,
      effectiveDate: "",
      changeReason: "",
      supportingNotes: "",
      attachmentName: "",
      attachmentUrl: "",
    },
  });

  const isEditable =
    application?.status === ApplicationStatus.DRAFT ||
    application?.status === ApplicationStatus.CHANGES_REQUESTED;

  useEffect(() => {
    if (!application) return;

    if (!isEditable) {
      toast({
        title: "Cannot edit",
        description:
          "Only Draft or Changes Requested applications can be edited.",
        variant: "destructive",
      });
      setLocation(`/applications/${applicationId}`);
      return;
    }

    form.reset({
      title: application.title ?? "",
      category: (application.category as typeof CATEGORY_VALUES[number]) ?? undefined,
      companyName: application.companyName,
      registrationNumber: application.registrationNumber,
      beneficialOwnerName: application.beneficialOwnerName,
      ownershipPercentage: application.ownershipPercentage,
      effectiveDate: application.effectiveDate ?? "",
      changeReason: application.changeReason,
      supportingNotes: application.supportingNotes ?? "",
      attachmentName: application.attachmentName ?? "",
      attachmentUrl: application.attachmentUrl ?? "",
    });
  }, [application]);

  const updateMutation = useUpdateApplication();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await upload(file);
      form.setValue("attachmentUrl", result.url);
      form.setValue("attachmentName", result.name);
      toast({ title: "File uploaded", description: result.name });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = () => {
    form.setValue("attachmentUrl", "");
    form.setValue("attachmentName", "");
  };

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { id: applicationId, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetApplicationQueryKey(applicationId),
          });
          toast({
            title: "Changes Saved",
            description:
              application?.status === ApplicationStatus.CHANGES_REQUESTED
                ? "Your changes have been saved. The application is now a Draft — submit it for review when ready."
                : "Your request has been updated.",
          });
          setLocation(`/applications/${applicationId}`);
        },
        onError: (err) => {
          toast({
            title: "Error",
            description:
              (err as { message?: string }).message ||
              "Failed to update request.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading || !application) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isResubmit =
    application.status === ApplicationStatus.CHANGES_REQUESTED;
  const attachmentName = form.watch("attachmentName");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/applications/${applicationId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isResubmit ? "Address Reviewer Changes" : "Edit Change Request"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {application.companyName} ({application.registrationNumber})
          </p>
        </div>
      </div>

      {isResubmit && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-900">
              Reviewer requested changes
            </p>
            <p className="text-sm text-orange-800 mt-0.5">
              Update the fields below based on the reviewer's feedback. Saving
              will return this application to Draft — you can then submit it for
              review again from the detail page.
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Request Identity ── */}
          <Card>
            <CardHeader>
              <CardTitle>Request Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_VALUES.map((v) => (
                            <SelectItem key={v} value={v}>
                              {CATEGORY_LABELS[v]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Company & Ownership ── */}
          <Card>
            <CardHeader>
              <CardTitle>Company & Ownership Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="changeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Change</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px]" {...field} />
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
                      <Textarea className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Supporting Document ── */}
          <Card>
            <CardHeader>
              <CardTitle>Supporting Document (Optional)</CardTitle>
              <CardDescription>
                Attach one document. PDF, JPEG, PNG, or Word — max 5 MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attachmentName ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">{attachmentName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={removeAttachment}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href={`/applications/${applicationId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isUploading}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : isResubmit ? (
                "Save Changes"
              ) : (
                "Update Draft"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
