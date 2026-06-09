import { expect, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Registra os matchers do jest-dom (toBeInTheDocument, toHaveTextContent, ...).
expect.extend(matchers);

// Limpa o DOM renderizado entre os testes.
afterEach(() => cleanup());
