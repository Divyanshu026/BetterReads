import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { CircleCheckIcon } from "lucide-react"

export function Pattern() {
  return (
    <Alert>
      <CircleCheckIcon
      />
      <AlertTitle>Alert!</AlertTitle>
      <AlertDescription>
        This is an alert with icon, title and description.
      </AlertDescription>
    </Alert>
  )
}