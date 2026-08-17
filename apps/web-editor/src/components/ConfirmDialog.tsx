import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Confirmation {
  title: string;
  description: string;
  /** What the button that goes ahead says, in the words of what it does. */
  action: string;
  confirm(): void;
}

/**
 * One dialog for every question the editor has to ask before it loses or replaces
 * something. The question is data, so the answer arrives where it was asked from
 * rather than through a flag per case.
 */
export function ConfirmDialog({
  confirmation,
  onCancel,
}: {
  confirmation: Confirmation | null;
  onCancel(): void;
}) {
  return (
    <AlertDialog
      open={confirmation !== null}
      onOpenChange={(next) => !next && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmation?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              confirmation?.confirm();
              onCancel();
            }}
          >
            {confirmation?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
