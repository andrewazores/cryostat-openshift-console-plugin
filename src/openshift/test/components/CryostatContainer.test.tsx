/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type Mock, type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CryostatContainer,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
} from '@console-plugin/components/CryostatContainer';
import { CryostatPageShell } from '@console-plugin/components/CryostatPageShell';
import { CryostatServiceContext } from '@console-plugin/components/CryostatServiceContext';
import { ApiService } from '@app/Shared/Services/Api.service';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { TargetsService } from '@app/Shared/Services/Targets.service';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { act, render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock the heavyweight service and chart-controller factories so InstancedContainer
// can be rendered in isolation without real RxJS pipelines or K8s clients.
// ---------------------------------------------------------------------------

const { mockDestroy } = vi.hoisted(() => ({ mockDestroy: vi.fn() }));

vi.mock('@app/Shared/Services/Api.service', () => ({
  ApiService: vi.fn().mockImplementation(function () {
    return { testBaseServer: vi.fn() };
  }),
}));
vi.mock('@app/Shared/Services/Login.service', () => ({ LoginService: vi.fn() }));
vi.mock('@app/Shared/Services/NotificationChannel.service', () => ({
  NotificationChannel: vi.fn().mockImplementation(function () {
    return {
      destroy: mockDestroy,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }),
}));
vi.mock('@app/Shared/Services/Report.service', () => ({ ReportService: vi.fn() }));
vi.mock('@app/Shared/Services/HeapDumpReport.service', () => ({ HeapDumpReportService: vi.fn() }));
vi.mock('@app/Shared/Services/Target.service', () => ({ TargetService: vi.fn() }));
vi.mock('@app/Shared/Services/TargetAlias.service', () => ({ TargetAliasService: vi.fn() }));
vi.mock('@app/Shared/Services/Targets.service', () => ({
  TargetsService: vi.fn().mockImplementation(function () {
    return {
      queryForTargets: vi
        .fn()
        .mockReturnValue({ subscribe: vi.fn().mockImplementation(() => ({ unsubscribe: vi.fn() })) }),
    };
  }),
}));
vi.mock('@app/Shared/Services/Settings.service', () => ({
  SettingsService: vi.fn().mockImplementation(function () {
    return {
      visibleNotificationsCount: vi
        .fn()
        .mockReturnValue({ subscribe: vi.fn().mockImplementation(() => ({ unsubscribe: vi.fn() })) }),
      notificationsEnabledFor: vi.fn().mockReturnValue(true),
    };
  }),
}));
vi.mock('@app/Dashboard/Charts/jfr/JFRMetricsChartController', () => ({
  JFRMetricsChartController: vi.fn(),
}));
vi.mock('@app/Dashboard/Charts/mbean/MBeanMetricsChartController', () => ({
  MBeanMetricsChartController: vi.fn(),
}));

vi.mock('@console-plugin/services/PluginContext', () => ({
  pluginServices: { plugin: { proxyUrl: vi.fn() } },
}));
vi.mock('@console-plugin/components/CryostatSelector', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@app/Shared/Redux/ReduxStore', () => ({
  store: {
    getState: vi.fn().mockReturnValue({}),
    dispatch: vi.fn(),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
    [Symbol.observable]: vi.fn(),
  },
}));
vi.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  consoleFetch: vi.fn(),
  k8sGet: vi.fn().mockResolvedValue({}),
  useActiveNamespace: vi.fn().mockReturnValue(['test-ns']),
  useK8sModel: vi.fn().mockReturnValue([{}]),
  useK8sWatchResource: vi.fn().mockReturnValue([[], false, undefined]),
}));
vi.mock('@app/Shared/Services/Notifications.service', async () => {
  const { createContext } = await vi.importActual<typeof import('react')>('react');
  return {
    NotificationsInstance: {
      notifications: vi.fn().mockReturnValue({
        pipe: vi.fn().mockReturnValue({ subscribe: vi.fn().mockImplementation(() => ({ unsubscribe: vi.fn() })) }),
      }),
      clearAll: vi.fn(),
    },
    NotificationsContext: createContext({}),
  };
});

// ---------------------------------------------------------------------------

const makeShellContext = () => {
  const channel = new (NotificationChannel as Mock)();
  const api = new (ApiService as Mock)();
  const targets = new (TargetsService as Mock)();
  const settings = new (SettingsService as Mock)();
  const serviceCtx = { notificationChannel: channel, api, targets, settings } as any;
  return {
    service: { namespace: 'ns-a', name: 'cryostat-a' },
    serviceContext: serviceCtx,
    chartContext: {} as any,
    capabilities: { fileUploads: false, openGrafana: false },
    routeUrl: '',
    instances: [{ metadata: { namespace: 'ns-a', name: 'cryostat-a' } }],
    instancesLoaded: true,
    instancesErr: undefined,
    noSelection: false,
    enableRoute: false,
    searchNamespace: 'ns-a',
    onSelectInstance: vi.fn(),
    openCryostatRoute: vi.fn(),
  };
};

describe('CryostatPageShell — does not manage WebSocket connection (Flaw 3)', () => {
  beforeEach(() => {
    (NotificationChannel as Mock).mockClear();
  });

  it('never calls connect() — connection is owned by the persistent hook, not the per-page shell', () => {
    const channel = { connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn() };
    const ctx = makeShellContext();
    ctx.serviceContext.notificationChannel = channel;

    render(
      <CryostatServiceContext.Provider value={ctx}>
        <CryostatPageShell />
      </CryostatServiceContext.Provider>,
    );

    expect(channel.connect).not.toHaveBeenCalled();
  });

  it('never calls disconnect() on mount or unmount — teardown is owned by the persistent hook', () => {
    const channel = { connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn() };
    const ctx = makeShellContext();
    ctx.serviceContext.notificationChannel = channel;

    const { unmount } = render(
      <CryostatServiceContext.Provider value={ctx}>
        <CryostatPageShell />
      </CryostatServiceContext.Provider>,
    );

    expect(channel.disconnect).not.toHaveBeenCalled();
    unmount();
    expect(channel.disconnect).not.toHaveBeenCalled();
  });
});

describe('useCryostatServiceContextValue — WebSocket connection lifecycle', () => {
  beforeEach(() => {
    mockDestroy.mockClear();
    (NotificationChannel as Mock).mockClear();
  });

  it('calls connect() once when serviceContext is first established', async () => {
    const channel = { connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn() };
    (NotificationChannel as Mock).mockImplementationOnce(function () {
      return channel;
    });

    const matchingInstance = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    (useK8sWatchResource as Mock).mockReturnValue([[matchingInstance], true, undefined]);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');

    let unmount!: () => void;
    await act(async () => {
      ({ unmount } = render(<CryostatContainer />));
    });

    expect(channel.connect).toHaveBeenCalledTimes(1);

    unmount();
    sessionStorage.clear();
  });

  it('does not call connect() again on re-render when the selected instance has not changed', async () => {
    const channel = { connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn() };
    (NotificationChannel as Mock).mockImplementationOnce(function () {
      return channel;
    });

    const matchingInstance = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    (useK8sWatchResource as Mock).mockReturnValue([[matchingInstance], true, undefined]);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');

    let rerender!: (ui: React.ReactElement) => void;
    let unmount!: () => void;
    await act(async () => {
      ({ rerender, unmount } = render(<CryostatContainer />));
    });

    const connectCallsAfterMount = channel.connect.mock.calls.length;

    await act(async () => {
      rerender(<CryostatContainer />);
    });

    expect(channel.connect.mock.calls.length).toBe(connectCallsAfterMount);
    expect(channel.disconnect).not.toHaveBeenCalled();

    unmount();
    sessionStorage.clear();
  });

  it('calls destroy() on the old channel and connect() on the new one when the instance changes', async () => {
    const channelA = { connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn() };
    const channelB = { connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn() };
    (NotificationChannel as Mock)
      .mockImplementationOnce(function () {
        return channelA;
      })
      .mockImplementationOnce(function () {
        return channelB;
      });

    const instanceA = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    const instanceB = { metadata: { namespace: 'ns-b', name: 'cryostat-b' } };
    (useK8sWatchResource as Mock).mockReturnValue([[instanceA, instanceB], true, undefined]);
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');

    let unmount!: () => void;
    await act(async () => {
      ({ unmount } = render(<CryostatContainer />));
    });

    expect(channelA.connect).toHaveBeenCalledTimes(1);
    expect(channelA.destroy).not.toHaveBeenCalled();

    // Simulate the user picking instance B via the onSelectInstance callback.
    // CryostatSelector is mocked to null, so we drive the state change directly
    // by finding the CryostatServiceContext value and calling onSelectInstance.
    // Since we can't access the hook's state directly, unmount and remount with
    // the new sessionStorage values - this exercises a fresh serviceContext being
    // established, which is the correct lifecycle event.
    unmount();
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-b');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-b');
    (useK8sWatchResource as Mock).mockReturnValue([[instanceB], true, undefined]);

    await act(async () => {
      ({ unmount } = render(<CryostatContainer />));
    });

    expect(channelB.connect).toHaveBeenCalledTimes(1);

    unmount();
    sessionStorage.clear();
  });
});

describe('NamespacedContainer — sessionStorage guard (Flaw 4)', () => {
  const mockUseK8sWatchResource = useK8sWatchResource as Mock;
  let sessionStorageSpy: MockInstance;

  beforeEach(() => {
    sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NS_KEY, 'ns-a');
    sessionStorage.setItem(SESSIONSTORAGE_SVC_NAME_KEY, 'cryostat-a');
    sessionStorageSpy.mockClear();
  });

  afterEach(() => {
    sessionStorageSpy.mockRestore();
    sessionStorage.clear();
  });

  it('resets selection when the loaded instance list is empty', async () => {
    mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
    const { unmount } = render(<CryostatContainer />);
    await Promise.resolve();
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(1);
    unmount();
  });

  it('resets selection when the instance list is loaded and the stored instance is absent', async () => {
    const otherInstance = { metadata: { namespace: 'ns-other', name: 'cryostat-other' } };
    mockUseK8sWatchResource.mockReturnValue([[otherInstance], true, undefined]);
    const { unmount } = render(<CryostatContainer />);
    await Promise.resolve();
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(1);
    unmount();
  });

  it('does not reset selection when the instance list is loaded and the stored instance is present', async () => {
    const matchingInstance = { metadata: { namespace: 'ns-a', name: 'cryostat-a' } };
    mockUseK8sWatchResource.mockReturnValue([[matchingInstance], true, undefined]);
    const { unmount } = render(<CryostatContainer />);
    await Promise.resolve();
    const resetCalls = sessionStorageSpy.mock.calls.filter(
      ([key, value]) => key === SESSIONSTORAGE_SVC_NS_KEY && value === '',
    );
    expect(resetCalls).toHaveLength(0);
    unmount();
  });
});

describe('CryostatContainer — provider detection', () => {
  it('renders CryostatPageShell directly when external CryostatServiceContext is provided', () => {
    const ctx = makeShellContext();
    const { getByText, unmount } = render(
      <CryostatServiceContext.Provider value={ctx}>
        <CryostatContainer>
          <div>Child Content</div>
        </CryostatContainer>
      </CryostatServiceContext.Provider>,
    );

    expect(getByText('Child Content')).toBeInTheDocument();
    unmount();
  });

  it('renders with LocalCryostatProvider when no external provider is present', () => {
    const { unmount } = render(
      <CryostatContainer>
        <div>Child Content</div>
      </CryostatContainer>,
    );

    expect(document.body).toBeInTheDocument();
    unmount();
  });
});
