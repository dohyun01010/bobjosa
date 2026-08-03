'use client';

import React, { useState, useEffect } from 'react';
import { LearningRules, FewShotExample, MenuItem } from '../types';
import { parseChatWithAi } from '../lib/aiParser';

interface AiTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMenuItems?: MenuItem[];
  apiKey?: string;
  onRulesUpdated?: () => void;
}

export default function AiTrainingModal({
  isOpen,
  onClose,
  existingMenuItems = [],
  apiKey = '',
  onRulesUpdated,
}: AiTrainingModalProps) {
  const [activeTab, setActiveTab] = useState<'aliases' | 'fewshot' | 'playground' | 'logs'>('aliases');
  const [rules, setRules] = useState<LearningRules>({
    learnedAliasMap: {},
    fewShotExamples: [],
    customPromptInstructions: [],
    learningLogs: [],
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Alias Form State
  const [aliasInput, setAliasInput] = useState('');
  const [targetMenuInput, setTargetMenuInput] = useState('');

  // FewShot Form State
  const [fsInputChat, setFsInputChat] = useState('');
  const [fsExpectedOutput, setFsExpectedOutput] = useState('');
  const [fsDescription, setFsDescription] = useState('');

  // Prompt Instructions State
  const [instructionsText, setInstructionsText] = useState('');

  // Playground State
  const [pgTestText, setPgTestText] = useState('오후 12:15 김철수 고국 하나요\n오후 12:16 이영희 불싸이 1 세트로');
  const [pgResult, setPgResult] = useState<any>(null);
  const [pgLoading, setPgLoading] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/learning');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
        if (data.customPromptInstructions) {
          setInstructionsText(data.customPromptInstructions.join('\n'));
        }
      }
    } catch (e) {
      console.error('Failed to load learning rules:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddAlias = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aliasInput.trim() || !targetMenuInput.trim()) {
      alert('줄임말/별칭과 연결할 정식 메뉴명을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_alias',
          alias: aliasInput.trim(),
          targetMenu: targetMenuInput.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rules) {
          setRules(data.rules);
          setAliasInput('');
          setTargetMenuInput('');
          if (onRulesUpdated) onRulesUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to add alias:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlias = async (alias: string) => {
    if (!confirm(`"${alias}" 학습 규칙을 삭제하시겠습니까?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_alias',
          alias,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rules) {
          setRules(data.rules);
          if (onRulesUpdated) onRulesUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to delete alias:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFewShot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fsInputChat.trim() || !fsExpectedOutput.trim()) {
      alert('입력 대화 예시와 예상 파싱 결과를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_fewshot',
          fewShot: {
            inputChat: fsInputChat,
            expectedOutput: fsExpectedOutput,
            description: fsDescription || '사용자 학습 예시',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rules) {
          setRules(data.rules);
          setFsInputChat('');
          setFsExpectedOutput('');
          setFsDescription('');
          if (onRulesUpdated) onRulesUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to add few-shot:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFewShot = async (id: string) => {
    if (!confirm('해당 대화 학습 예시를 삭제하시겠습니까?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_fewshot',
          id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rules) {
          setRules(data.rules);
          if (onRulesUpdated) onRulesUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to delete few-shot:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstructions = async () => {
    const list = instructionsText.split('\n').filter(s => s.trim());
    setLoading(true);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_instructions',
          customInstructions: list,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rules) {
          setRules(data.rules);
          alert('AI 특수 지시사항 프롬프트가 성공적으로 반영되었습니다!');
          if (onRulesUpdated) onRulesUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to update instructions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPlayground = async () => {
    if (!pgTestText.trim()) return;
    setPgLoading(true);
    try {
      const result = await parseChatWithAi(pgTestText, existingMenuItems, apiKey);
      setPgResult(result);
    } catch (e) {
      console.error('Playground test error:', e);
    } finally {
      setPgLoading(false);
    }
  };

  const aliasEntries = Object.entries(rules.learnedAliasMap || {}).filter(([alias, target]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return alias.toLowerCase().includes(q) || target.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-[var(--colors-surface-onyx)] border border-[var(--border-primary)] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-sm">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--colors-hairline)] bg-gradient-to-r from-[var(--colors-surface-indigo)] to-[#1e1b4b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xl shadow-md">
              🧠
            </div>
            <div>
              <h2 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                <span>AI 학습 센터</span>
                <span className="badge-magenta text-[10px]">REAL-TIME LEARNING</span>
              </h2>
              <p className="text-xs text-[var(--colors-muted)]">
                줄임말, 별칭, 구어체를 학습시켜 카카오톡 대화 분석 정확도를 100%로 향상시킵니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--colors-surface-onyx)] hover:bg-red-500/20 text-[var(--colors-muted)] hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--colors-hairline)] bg-[var(--colors-surface-indigo)] px-4 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('aliases')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'aliases'
                ? 'border-[var(--colors-magenta)] text-[var(--colors-magenta)] font-bold'
                : 'border-transparent text-[var(--colors-muted)] hover:text-white'
            }`}
          >
            <span>🔤 별칭 & 단어 교정</span>
            <span className="bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full text-[10px]">
              {Object.keys(rules.learnedAliasMap || {}).length}개
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fewshot')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'fewshot'
                ? 'border-[var(--colors-magenta)] text-[var(--colors-magenta)] font-bold'
                : 'border-transparent text-[var(--colors-muted)] hover:text-white'
            }`}
          >
            <span>💬 대화 패턴 예시 (Few-Shot)</span>
            <span className="bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full text-[10px]">
              {(rules.fewShotExamples || []).length}개
            </span>
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'playground'
                ? 'border-[var(--colors-magenta)] text-[var(--colors-magenta)] font-bold'
                : 'border-transparent text-[var(--colors-muted)] hover:text-white'
            }`}
          >
            <span>🧪 실시간 AI 시뮬레이터</span>
            <span className="bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded-full text-[9px]">PLAY</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[var(--colors-magenta)] text-[var(--colors-magenta)] font-bold'
                : 'border-transparent text-[var(--colors-muted)] hover:text-white'
            }`}
          >
            <span>📜 학습 이력</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: ALIAS RULES */}
          {activeTab === 'aliases' && (
            <div className="space-y-5">
              {/* Form Card */}
              <form onSubmit={handleAddAlias} className="p-4 rounded-xl bg-[var(--colors-surface-indigo)] border border-[var(--border-primary)] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>✨ 새로운 줄임말/별칭 학습 등록</span>
                </h3>
                <p className="text-xs text-[var(--colors-muted)]">
                  사용자가 카톡에서 줄여 부르는 말(예: <strong className="text-yellow-300">고국</strong>)을 정식 메뉴명(<strong className="text-green-300">고기국수</strong>)으로 연결하면 다음부터 자동 인식됩니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-[var(--colors-muted)] mb-1">
                      줄임말 / 오타 / 별칭
                    </label>
                    <input
                      type="text"
                      placeholder="예: 고국, 불싸이, 상하이"
                      value={aliasInput}
                      onChange={e => setAliasInput(e.target.value)}
                      className="discord-input text-xs w-full"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-[var(--colors-muted)] mb-1">
                      연결할 정식 메뉴명
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="예: 고기국수, 싸이버거"
                        value={targetMenuInput}
                        onChange={e => setTargetMenuInput(e.target.value)}
                        className="discord-input text-xs w-full"
                      />
                      {existingMenuItems.length > 0 && (
                        <select
                          onChange={e => {
                            if (e.target.value) setTargetMenuInput(e.target.value);
                          }}
                          className="discord-select text-xs max-w-[120px]"
                          defaultValue=""
                        >
                          <option value="" disabled>기존 메뉴 선택</option>
                          {existingMenuItems.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="button-magenta text-xs font-bold w-full h-[38px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>+ 학습 추가</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Rules List Header */}
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span>학습된 어휘 규칙 목록</span>
                  <span className="text-[var(--colors-muted)] font-normal">({aliasEntries.length}개)</span>
                </h4>
                <input
                  type="text"
                  placeholder="학습 어휘 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="discord-input text-xs py-1 px-3 w-48"
                />
              </div>

              {/* Rules Grid */}
              {aliasEntries.length === 0 ? (
                <div className="text-center py-8 text-[var(--colors-muted)] text-xs border border-dashed border-[var(--colors-hairline)] rounded-xl">
                  등록된 별칭 학습 규칙이 없습니다. 위 폼을 이용해 첫 학습 규칙을 추가해보세요!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aliasEntries.map(([alias, target]) => (
                    <div
                      key={alias}
                      className="p-3 rounded-lg bg-[var(--colors-surface-indigo)] border border-[var(--colors-hairline)] flex items-center justify-between gap-3 text-xs hover:border-[var(--colors-magenta)] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 font-extrabold border border-purple-700/50 truncate">
                          &ldquo;{alias}&rdquo;
                        </span>
                        <span className="text-[var(--colors-muted)]">➔</span>
                        <span className="px-2 py-0.5 rounded bg-green-900/50 text-green-200 font-bold border border-green-700/50 truncate">
                          {target}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteAlias(alias)}
                        className="text-red-400 hover:text-red-300 p-1 font-bold text-xs cursor-pointer"
                        title="학습 규칙 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FEW-SHOT EXAMPLES & PROMPT INSTRUCTIONS */}
          {activeTab === 'fewshot' && (
            <div className="space-y-6">
              {/* FewShot Form Card */}
              <form onSubmit={handleAddFewShot} className="p-4 rounded-xl bg-[var(--colors-surface-indigo)] border border-[var(--border-primary)] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>💬 새로운 대화 파싱 예시(Few-Shot) 추가</span>
                </h3>
                <p className="text-xs text-[var(--colors-muted)]">
                  특이한 카톡 문장과 원하는 정제 결과를 예시로 학습시키면 Gemini AI가 유사한 패턴을 정확하게 다룹니다.
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--colors-muted)] mb-1">
                      카톡 대화 입력 예시
                    </label>
                    <input
                      type="text"
                      placeholder="예: 오후 12:15 김철수 고국 1개 치즈추가"
                      value={fsInputChat}
                      onChange={e => setFsInputChat(e.target.value)}
                      className="discord-input text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--colors-muted)] mb-1">
                      원하는 정제 규칙 설명 / 결과
                    </label>
                    <input
                      type="text"
                      placeholder="예: 김철수: 고기국수(치즈추가) 1개"
                      value={fsExpectedOutput}
                      onChange={e => setFsExpectedOutput(e.target.value)}
                      className="discord-input text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--colors-muted)] mb-1">
                      학습 목적 / 메모 (선택)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 옵션 추가와 줄임말이 동시에 쓰인 구어체 패턴"
                      value={fsDescription}
                      onChange={e => setFsDescription(e.target.value)}
                      className="discord-input text-xs w-full"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="button-magenta text-xs font-bold py-2 px-4 rounded-lg w-full flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>+ 대화 패턴 예시 추가</span>
                  </button>
                </div>
              </form>

              {/* FewShot List */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs">등록된 Few-Shot 대화 학습 예시 ({rules.fewShotExamples?.length || 0}개)</h4>
                {(!rules.fewShotExamples || rules.fewShotExamples.length === 0) ? (
                  <div className="text-center py-6 text-[var(--colors-muted)] text-xs border border-dashed border-[var(--colors-hairline)] rounded-xl">
                    등록된 Few-Shot 예시가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.fewShotExamples.map(ex => (
                      <div key={ex.id} className="p-3.5 rounded-xl bg-[var(--colors-surface-indigo)] border border-[var(--colors-hairline)] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-300 flex items-center gap-1">
                            <span>📌</span> {ex.description}
                          </span>
                          <button
                            onClick={() => handleDeleteFewShot(ex.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-bold cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                        <div className="bg-[var(--colors-surface-onyx)] p-2 rounded border border-[var(--colors-hairline)] font-mono text-[11px] space-y-1">
                          <div className="text-gray-400">Input: <span className="text-gray-200">&quot;{ex.inputChat}&quot;</span></div>
                          <div className="text-green-400">Rule: <span>{ex.expectedOutput}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Prompt Instructions Editor */}
              <div className="p-4 rounded-xl bg-[var(--colors-surface-indigo)] border border-[var(--border-primary)] space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span>⚙️ AI 특수 지시사항 (Custom System Prompt)</span>
                </h4>
                <p className="text-xs text-[var(--colors-muted)]">
                  Gemini AI 모델에게 직접 전달될 한 줄 지시사항을 줄바꿈으로 구분하여 입력할 수 있습니다.
                </p>
                <textarea
                  rows={3}
                  value={instructionsText}
                  onChange={e => setInstructionsText(e.target.value)}
                  placeholder="예: 메뉴명의 줄임말이 들어오면 등록된 학습 별칭 규칙을 최우선으로 적용할 것."
                  className="discord-textarea text-xs w-full"
                />
                <button
                  onClick={handleSaveInstructions}
                  disabled={loading}
                  className="button-green text-xs font-bold py-2 px-4 rounded-lg cursor-pointer"
                >
                  지시사항 저장
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PLAYGROUND SIMULATOR */}
          {activeTab === 'playground' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--colors-surface-indigo)] border border-[var(--border-primary)] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🧪 AI 학습 결과 실시간 시뮬레이터</span>
                </h3>
                <p className="text-xs text-[var(--colors-muted)]">
                  테스트 카톡 대화를 입력하고 시뮬레이션 버튼을 누르면 현재 학습된 어휘 및 예시가 잘 반영되는지 즉시 검증할 수 있습니다.
                </p>

                <textarea
                  rows={4}
                  value={pgTestText}
                  onChange={e => setPgTestText(e.target.value)}
                  placeholder="테스트할 카톡 원문 텍스트..."
                  className="discord-textarea text-xs w-full"
                />

                <button
                  onClick={handleRunPlayground}
                  disabled={pgLoading}
                  className="button-magenta text-xs font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
                >
                  {pgLoading ? (
                    <span>AI 시뮬레이션 분석 중...</span>
                  ) : (
                    <>
                      <span>⚡ 학습 규칙 적용 시뮬레이션</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simulation Result Box */}
              {pgResult && (
                <div className="p-4 rounded-xl bg-[var(--colors-surface-onyx)] border border-green-500/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-green-400 text-xs flex items-center gap-2">
                      <span>✅ AI 파싱 결과</span>
                    </h4>
                    <span className="badge-green text-[10px]">ANALYSIS SUCCESS</span>
                  </div>

                  <div className="space-y-2">
                    {pgResult.userOrders && pgResult.userOrders.map((u: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-[var(--colors-surface-indigo)] border border-[var(--colors-hairline)] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{u.userName} ({u.departmentName})</span>
                        </div>
                        <div className="pl-2 border-l-2 border-purple-500 space-y-1 text-gray-300 font-mono text-[11px]">
                          {u.items.map((item: any, iIdx: number) => (
                            <div key={iIdx} className="flex items-center gap-2">
                              <span>• {item.matchedMenuName || item.rawText}</span>
                              <span className="text-yellow-400 font-bold">x {item.quantity}</span>
                              {rules.learnedAliasMap[item.rawText] && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 text-[10px]">
                                  ✨ 학습 적용 (&ldquo;{item.rawText}&rdquo; ➔ &ldquo;{rules.learnedAliasMap[item.rawText]}&rdquo;)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs">최근 AI 학습 작업 이력</h4>
              {(!rules.learningLogs || rules.learningLogs.length === 0) ? (
                <div className="text-center py-6 text-[var(--colors-muted)] text-xs border border-dashed border-[var(--colors-hairline)] rounded-xl">
                  학습 이력이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.learningLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-lg bg-[var(--colors-surface-indigo)] border border-[var(--colors-hairline)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300">
                          {log.action}
                        </span>
                        <span className="text-gray-200">{log.detail}</span>
                      </div>
                      <span className="text-[10px] text-[var(--colors-muted)] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--colors-hairline)] bg-[var(--colors-surface-indigo)] flex items-center justify-between text-xs">
          <div className="text-[var(--colors-muted)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse"></span>
            <span>학습된 규칙은 Cloud DB(Supabase)와 로컬에 실시간 자동 저장됩니다.</span>
          </div>

          <button
            onClick={onClose}
            className="discord-button text-xs py-1.5 px-4 font-bold cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
