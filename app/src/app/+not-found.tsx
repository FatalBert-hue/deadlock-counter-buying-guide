// +not-found — what renders for a URL that matches no route.
// Per the Expo Router docs (router/reference/not-found), any component
// can be exported here instead of the default "Unmatched Route" screen.
//
// This matters for .json files opened with "Open with DCB": Android hands
// the app the file's content:// URI, and Expo re-schemes it to something
// like counter-buy:///com.google.android.apps.messaging.shared.datamodel
// .ProxyProvider/-1593….json — a path that is not a route. The import
// itself is handled separately by DeepLinkHandler; this screen only makes
// sure the user never lands on a dead end. It sends them straight home,
// where the "Build imported" alert (with its View Builds button) is
// waiting.
import { Redirect } from 'expo-router';

export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
