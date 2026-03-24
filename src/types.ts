/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  pdv: number;
  commission: number;
  quantity: number;
}

export interface Employee {
  id: string;
  name: string;
  sector: string;
}

export interface DistributionItem {
  product: Product;
  quantity: number;
  returned: number;
}

export interface DistributionResult {
  [employeeId: string]: {
    employee: Employee;
    items: DistributionItem[];
    cashFloat: number;
    cashReceived: number;
    cardReceived: number;
    sangria: number;
  };
}
