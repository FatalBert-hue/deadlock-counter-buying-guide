import { NativeTabs } from 'expo-router/native-tabs';

import { useSettings } from '@/state/settings';

export default function AppTabs() {
  const { palette } = useSettings();

  return (
    <NativeTabs
      backgroundColor={palette.bg}
      indicatorColor={palette.panel2}
      labelStyle={{ selected: { color: palette.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Full build</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/full-build.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="quick-pick">
        <NativeTabs.Trigger.Label>Quick pick</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/quick-pick.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="counter-sheet">
        <NativeTabs.Trigger.Label>Counter sheet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/counter-sheet.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="patch">
        <NativeTabs.Trigger.Label>Patch</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/patch.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/saved.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
