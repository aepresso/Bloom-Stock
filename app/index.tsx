// Root route — the tab navigator has no route at "/" itself (tabs start at
// /orders, /stock, etc.), so this redirects the PWA's start_url ("/") into the app.
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/orders" />;
}
