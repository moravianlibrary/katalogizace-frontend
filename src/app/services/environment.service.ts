// This service is responsible for loading and providing the environment configuration for the application.
// It loads both runtime and build-time configurations.
// The runtime configuration is loaded from a JSON file (env.json) or from the static environment file (environment.ts), depending on the value of `useStaticRuntimeConfig` in the environment file.
// The build-time configuration is loaded from a JSON file (build-info.json). 

import { Injectable } from '@angular/core';
import { environment as staticEnv } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {

    private configRuntime: any = {};
    private configBuildtime: any = {};

    public async load(): Promise<void> {
        // Load runtime configuration from env.json or static environment (environment.ts)
        if (staticEnv.useStaticRuntimeConfig) {
            try {
                const response = await fetch('/assets/env.json');
                if (!response.ok) throw new Error('env.json load failed');
                const data = await response.json();
                this.configRuntime = { ...staticEnv, ...data };
            } catch (err) {
                console.warn('env.json not found or invalid. Falling back to static env.');
                console.warn(err);
                this.configRuntime = staticEnv;
            }
        } else {
            this.configRuntime = staticEnv;
        }
        // Load build info from build-info.json
        try {
            const response = await fetch('/assets/build-info.json');
            if (!response.ok) throw new Error('build-info.json load failed');
            const data = await response.json();
            this.configBuildtime = data;
        } catch (err) {
            console.warn('build-info.json not found or invalid. Skipping build info.');
            this.configBuildtime = {};
        }
    }

    public get(key: string): any {
        const fromRuntimeConfig = this.configRuntime[key];
        const fromBuildConfig = this.configBuildtime[key];
        if (fromRuntimeConfig !== undefined) {
            return fromRuntimeConfig;
        } else if (fromBuildConfig !== undefined) {
            return fromBuildConfig;
        } else {
            console.warn(`Key "${key}" not found in configEnv or configBuildInfo.`);
            return undefined;
        }
    }
}
