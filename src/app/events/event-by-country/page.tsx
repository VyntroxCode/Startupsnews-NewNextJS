import { redirect } from "next/navigation";

export default function EventByCountryPage() {
  // Redirect to main events page for backward compatibility
  redirect("/events");
}
