// Root route — the tab navigator has no route at "/" itself, so this redirects
// the PWA's start_url ("/") to the Home dashboard, the app's landing screen.
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/home" />;
}
