import PlaceholderScreen from '@/components/placeholder-screen';

export default function PatchScreen() {
  return (
    <PlaceholderScreen
      title="Patch"
      body="The patch this data is current to, and what changed in it. When a new Deadlock patch lands, the app checks for a newer data file on launch and updates without a rebuild. Coming in Phase 2."
    />
  );
}
