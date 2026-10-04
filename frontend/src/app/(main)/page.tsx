import MainShell from "@/components/app-shell/MainShell";
import AuthenticationProvider from "@/providers/AuthenticationProvider";

export default function MainPage() {
  return (
    <AuthenticationProvider>
      <MainShell />
    </AuthenticationProvider>
  );
}
