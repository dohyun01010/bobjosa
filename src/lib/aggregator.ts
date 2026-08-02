import { UserOrder, AggregatedItem, DepartmentGroupOrder } from '../types';
import { DEPARTMENTS, DepartmentName } from '../constants';

/**
 * Group user orders by 5 departments.
 */
export function groupOrdersByDepartment(userOrders: UserOrder[]): DepartmentGroupOrder[] {
  const map = new Map<string, UserOrder[]>();

  for (const dept of DEPARTMENTS) {
    map.set(dept, []);
  }

  for (const uOrder of userOrders) {
    const dept = uOrder.departmentName || '모바일 앱 개발';
    const list = map.get(dept) || [];
    list.push(uOrder);
    map.set(dept, list);
  }

  return DEPARTMENTS.map(dept => {
    const orders = map.get(dept) || [];
    const totalCount = orders.reduce((sum, u) => {
      return (
        sum +
        u.items
          .filter(i => i.status === 'confirmed')
          .reduce((s, i) => s + i.quantity, 0)
      );
    }, 0);

    return {
      departmentName: dept,
      userOrders: orders,
      totalCount,
    };
  });
}

/**
 * Aggregate confirmed items for a specific department.
 */
export function aggregateDepartmentByName(
  targetDept: DepartmentName,
  userOrders: UserOrder[]
): { departmentName: string; items: AggregatedItem[]; totalCount: number } {
  const filteredOrders = userOrders.filter(u => u.departmentName === targetDept);
  const items = aggregateTotal(filteredOrders);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    departmentName: targetDept,
    items,
    totalCount,
  };
}

/**
 * Aggregate confirmed items for a single department.
 */
export function aggregateDepartment(userOrders: UserOrder[]): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>();

  for (const uOrder of userOrders) {
    for (const item of uOrder.items) {
      if (item.status === 'confirmed' && item.matchedMenuName) {
        const existing = map.get(item.matchedMenuName);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          map.set(item.matchedMenuName, {
            menuName: item.matchedMenuName,
            quantity: item.quantity,
          });
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Aggregate confirmed items across all user orders.
 */
export function aggregateTotal(userOrders: UserOrder[]): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>();

  for (const uOrder of userOrders) {
    for (const item of uOrder.items) {
      if (item.status === 'confirmed' && item.matchedMenuName) {
        const existing = map.get(item.matchedMenuName);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          map.set(item.matchedMenuName, {
            menuName: item.matchedMenuName,
            quantity: item.quantity,
          });
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Format simple order summary (Pure Menu Name and Quantity list only).
 * Omits title header and bottom grand total as requested.
 */
export function formatForKakao(
  restaurantName: string,
  userOrders: UserOrder[]
): string {
  const totalItems = aggregateTotal(userOrders);

  if (totalItems.length === 0) {
    return '주문 내역이 없습니다.';
  }

  return totalItems.map(item => `${item.menuName} ${item.quantity}`).join('\n');
}
