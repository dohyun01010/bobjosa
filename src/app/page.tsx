'use client';

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import UnifiedOrderCard from '../components/UnifiedOrderCard';
import OrderSummary from '../components/OrderSummary';
import MenuManagementModal from '../components/MenuManagementModal';
import ApiKeyModal from '../components/ApiKeyModal';
import AiTrainingModal from '../components/AiTrainingModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_RESTAURANTS, DepartmentName } from '../constants';
import {
  Restaurant,
  OrderSession,
  UserOrder,
  UnregisteredItem,
  AiParseResult,
  MenuItem,
} from '../types';
import {
  fetchRestaurantsFromDb,
  subscribeRestaurantsDb,
  saveRestaurantsToDb,
  addMenuItemToDb,
  addAliasToMenuItemDb,
  getLocalCachedRestaurants,
} from '../lib/dbService';
import {
  fetchMemberMapFromDb,
  subscribeMemberMapDb,
  saveMemberDepartmentToDb,
  getLocalMemberMap,
} from '../lib/memberDbService';
import { matchMenu } from '../lib/matcher';

const DEFAULT_FIXED_USER_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AQ.Ab8RN6L6TrLv1CcNx-2rK0oOVPnsubAtg06rFLhPJt-iv0WqvQ";

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    getLocalCachedRestaurants()
  );

  const [memberMap, setMemberMap] = useState<Record<string, DepartmentName>>(() =>
    getLocalMemberMap()
  );

  const [apiKey, setApiKey] = useLocalStorage<string>(
    'bobjosa_gemini_api_key',
    DEFAULT_FIXED_USER_KEY
  );

  const activeApiKey = (apiKey && apiKey.trim()) ? apiKey.trim() : DEFAULT_FIXED_USER_KEY;

  const [orderSession, setOrderSession] = useLocalStorage<OrderSession>(
    'bobjosa_current_order_session',
    {
      date: '',
      restaurantId: DEFAULT_RESTAURANTS[0]?.id || '',
      rawChatText: '',
      userOrders: [],
      unregisteredItems: [],
    }
  );

  const [unrecognizedUsers, setUnrecognizedUsers] = useState<string[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAiTrainingModalOpen, setIsAiTrainingModalOpen] = useState(false);

  useEffect(() => {
    fetchRestaurantsFromDb().then(data => {
      if (data && data.length > 0) setRestaurants(data);
    });

    fetchMemberMapFromDb().then(map => {
      if (map) setMemberMap(map);
    });

    const unsubRest = subscribeRestaurantsDb(updated => {
      if (updated && updated.length > 0) setRestaurants(updated);
    });

    const unsubMem = subscribeMemberMapDb(updatedMap => {
      if (updatedMap) setMemberMap(updatedMap);
    });

    return () => {
      unsubRest();
      unsubMem();
    };
  }, []);

  const selectedRestaurant = restaurants.find(r => r.id === orderSession.restaurantId);
  const currentMenuItems = selectedRestaurant ? selectedRestaurant.menuItems : [];

  const handleRestaurantChange = (restaurantId: string) => {
    setOrderSession(prev => ({ ...prev, restaurantId }));
  };

  const handleRawChatTextChange = (rawChatText: string) => {
    setOrderSession(prev => ({ ...prev, rawChatText }));
  };

  const handleAnalyzeComplete = (result: AiParseResult) => {
    setOrderSession(prev => ({
      ...prev,
      userOrders: result.userOrders,
      unregisteredItems: result.unregisteredItems || [],
    }));

    const currentMap = getLocalMemberMap();
    const unknownNames: string[] = [];
    for (const uOrder of result.userOrders) {
      const name = uOrder.userName.trim();
      if (name && name !== '주문자' && !currentMap[name]) {
        if (!unknownNames.includes(name)) {
          unknownNames.push(name);
        }
      }
    }
    setUnrecognizedUsers(unknownNames);
  };

  const handleSelectUserDepartment = async (
    memberName: string,
    departmentName: DepartmentName
  ) => {
    const cleanTargetName = memberName.trim();
    if (!cleanTargetName) return;

    setUnrecognizedUsers(prev =>
      prev.filter(name => {
        const n = name.trim();
        return n !== cleanTargetName && !n.includes(cleanTargetName) && !cleanTargetName.includes(n);
      })
    );

    const updatedMap = await saveMemberDepartmentToDb(
      cleanTargetName,
      departmentName,
      memberMap
    );
    setMemberMap(updatedMap);

    setOrderSession(prev => ({
      ...prev,
      userOrders: prev.userOrders.map(u => {
        const uName = u.userName.trim();
        if (
          uName === cleanTargetName ||
          uName.includes(cleanTargetName) ||
          cleanTargetName.includes(uName)
        ) {
          return { ...u, departmentName };
        }
        return u;
      }),
    }));
  };

  const handleDismissUnrecognizedUser = (memberName: string) => {
    setUnrecognizedUsers(prev => prev.filter(name => name !== memberName));
  };

  const handleUserOrderUpdate = (userOrders: UserOrder[]) => {
    setOrderSession(prev => ({ ...prev, userOrders }));
  };

  const handleDismissUnregisteredItem = (id: string) => {
    setOrderSession(prev => ({
      ...prev,
      unregisteredItems: (prev.unregisteredItems || []).filter(item => item.id !== id),
    }));
  };

  const handleAddMenuItemToDb = async (suggestedName: string, aliases: string[]) => {
    if (!orderSession.restaurantId) return;

    const newMenuItem: MenuItem = {
      id: `menu-${Date.now()}`,
      name: suggestedName,
      aliases: aliases || [],
    };

    const updated = await addMenuItemToDb(
      orderSession.restaurantId,
      newMenuItem,
      restaurants
    );
    setRestaurants(updated);

    const updatedMenuItems =
      updated.find(r => r.id === orderSession.restaurantId)?.menuItems || [];

    reMatchOrdersWithNewMenu(updatedMenuItems);
  };

  const handleAddAliasToDb = async (menuId: string, alias: string) => {
    if (!orderSession.restaurantId) return;

    const updated = await addAliasToMenuItemDb(
      orderSession.restaurantId,
      menuId,
      alias,
      restaurants
    );
    setRestaurants(updated);

    const updatedMenuItems =
      updated.find(r => r.id === orderSession.restaurantId)?.menuItems || [];

    reMatchOrdersWithNewMenu(updatedMenuItems);
  };

  const handleLearnAlias = async (alias: string, targetMenu: string) => {
    try {
      await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_alias',
          alias,
          targetMenu,
        }),
      });
    } catch (e) {
      console.error('Failed to save AI learning alias:', e);
    }
  };

  const reMatchOrdersWithNewMenu = (newMenuItems: MenuItem[]) => {
    setOrderSession(prev => {
      const reMatchedOrders = prev.userOrders.map(u => ({
        ...u,
        items: u.items.map(item => {
          if (item.status === 'confirmed') return item;
          const matched = matchMenu({ text: item.rawText, quantity: item.quantity }, newMenuItems);
          matched.quantity = item.quantity;
          return matched;
        }),
      }));

      return {
        ...prev,
        userOrders: reMatchedOrders,
      };
    });
  };

  const handleSaveRestaurants = async (newRestaurants: Restaurant[]) => {
    setRestaurants(newRestaurants);
    await saveRestaurantsToDb(newRestaurants);
  };

  const handleResetChatSession = () => {
    if (!confirm('입력된 대화 내용 및 분석 결과만 초기화하시겠습니까?\n(등록된 식당, 메뉴 및 직종 명단 DB는 안전하게 유지됩니다)')) return;
    setOrderSession(prev => ({
      ...prev,
      rawChatText: '',
      userOrders: [],
      unregisteredItems: [],
    }));
    setUnrecognizedUsers([]);
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <Header
          restaurants={restaurants}
          selectedRestaurantId={orderSession.restaurantId}
          onRestaurantChange={handleRestaurantChange}
          onOpenMenuManagement={() => setIsMenuModalOpen(true)}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          onOpenAiTraining={() => setIsAiTrainingModalOpen(true)}
          hasApiKey={true}
        />

        {/* Top Action Bar */}
        <div className="flex flex-wrap justify-between items-center mb-5 px-2 py-2.5 rounded-xl bg-[var(--colors-surface-indigo)] border border-[var(--border-primary)] shadow-sm">
          <div className="text-xs text-[var(--colors-muted)] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--colors-green)] inline-block animate-pulse"></span>
            <span>🌐 모든 사용자가 동기화되는 공유 DB가 연동되었습니다.</span>
          </div>
          <button
            onClick={handleResetChatSession}
            className="btn-discord-danger text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg cursor-pointer transition-transform hover:scale-102"
            title="현재 작성한 대화 텍스트와 분석 결과만 리셋 (메뉴/구성원 DB는 유지됨)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            대화 내용 초기화
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <UnifiedOrderCard
              rawChatText={orderSession.rawChatText}
              userOrders={orderSession.userOrders}
              unregisteredItems={orderSession.unregisteredItems || []}
              unrecognizedUsers={unrecognizedUsers}
              menuItems={currentMenuItems}
              restaurantSelected={Boolean(orderSession.restaurantId)}
              apiKey={activeApiKey}
              memberMap={memberMap}
              onRawTextChange={handleRawChatTextChange}
              onAnalyzeComplete={handleAnalyzeComplete}
              onUserOrderUpdate={handleUserOrderUpdate}
              onDismissUnregisteredItem={handleDismissUnregisteredItem}
              onAddMenuItemToDb={handleAddMenuItemToDb}
              onAddAliasToDb={handleAddAliasToDb}
              onLearnAlias={handleLearnAlias}
              onSelectUserDepartment={handleSelectUserDepartment}
              onDismissUnrecognizedUser={handleDismissUnrecognizedUser}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          </div>

          <div className="lg:col-span-5">
            <OrderSummary
              userOrders={orderSession.userOrders}
              restaurantName={selectedRestaurant ? selectedRestaurant.name : '선택 안됨'}
            />
          </div>
        </div>
      </div>

      {/* Menu & Restaurant Management Modal */}
      <MenuManagementModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        restaurants={restaurants}
        onSaveRestaurants={handleSaveRestaurants}
      />

      {/* Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={activeApiKey}
        onSaveApiKey={setApiKey}
      />

      {/* AI Training Center Modal */}
      <AiTrainingModal
        isOpen={isAiTrainingModalOpen}
        onClose={() => setIsAiTrainingModalOpen(false)}
        existingMenuItems={currentMenuItems}
        apiKey={activeApiKey}
      />
    </div>
  );
}
