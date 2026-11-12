// Store specs create stores through TestBed, which needs the JIT compiler and a test platform.
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach } from 'vitest';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

// every test gets a fresh injector, and with it fresh stores
afterEach(() => getTestBed().resetTestingModule());
