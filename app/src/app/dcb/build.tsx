// /dcb/build — the landing screen for the https App Link
// https://fatalbert-hue.github.io/dcb/build?data=...
// Android verifies the link against /.well-known/assetlinks.json on that
// host and opens DCB here. The shared import screen lives in
// src/components/import-build-screen.tsx (the same screen also serves
// dcb://import links at /import).
import ImportBuildScreen from '@/components/import-build-screen';

export default ImportBuildScreen;
