import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  MessageCircle, 
  LayoutDashboard, 
  BrainCircuit, 
  Image as ImageIcon,
  Send,
  Play,
  CheckCircle,
  XCircle,
  ChevronRight,
  Volume2
} from 'lucide-react';
import { AppTab, Message, Lesson, QuizQuestion, VocabCard } from './types';
import * as GeminiService from './geminiService';
import ReactMarkdown from 'react-markdown';

// --- Helper Components ---

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// --- Main App ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Hello! I am your AI English tutor. How can I help you today?', timestamp: Date.now() }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lesson State
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<string | null>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);

  // Vocab State
  const [vocabWord, setVocabWord] = useState('');
  const [currentCard, setCurrentCard] = useState<VocabCard | null>(null);
  const [isVocabLoading, setIsVocabLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('General Grammar');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // --- Chat Logic ---
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      // Format history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await GeminiService.sendChatMessage(history, newUserMsg.text);

      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "Kechirasiz, hozir javob bera olmayman.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newAiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'model',
         text: "Xatolik yuz berdi. Internetni tekshiring.",
         timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // --- Lesson Logic ---
  const lessonTopics = [
    { id: '1', title: 'Present Simple', level: 'Beginner', description: 'Kundalik ish-harakatlar haqida gapirish.' },
    { id: '2', title: 'Past Simple', level: 'Beginner', description: 'O\'tgan zamon fe\'llari.' },
    { id: '3', title: 'Future Tenses', level: 'Intermediate', description: 'Kelajak rejalari: Will va Going to.' },
    { id: '4', title: 'Conditionals', level: 'Intermediate', description: 'Shart gaplar (If structures).' },
    { id: '5', title: 'Phrasal Verbs', level: 'Advanced', description: 'Eng kerakli iborali fe\'llar.' },
  ];

  const loadLesson = async (lesson: any) => {
    setSelectedLesson(lesson);
    setLessonContent(null);
    setIsLessonLoading(true);
    try {
      const content = await GeminiService.generateLessonContent(lesson.title, lesson.level);
      setLessonContent(content);
    } catch (e) {
      setLessonContent("Failed to load lesson.");
    } finally {
      setIsLessonLoading(false);
    }
  };

  // --- Vocab Logic ---
  const handleGenerateCard = async () => {
    if (!vocabWord) return;
    setIsVocabLoading(true);
    setCurrentCard(null);
    try {
      const card = await GeminiService.generateVocabCard(vocabWord);
      setCurrentCard(card);
    } catch (e) {
      alert("So'zni topishda xatolik.");
    } finally {
      setIsVocabLoading(false);
    }
  };

  const playPronunciation = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
        const base64 = await GeminiService.generateSpeech(text);
        if (base64) {
             const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
             const audioBuffer = await audioContext.decodeAudioData(
                Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer
             );
             const source = audioContext.createBufferSource();
             source.buffer = audioBuffer;
             source.connect(audioContext.destination);
             source.start(0);
             source.onended = () => setIsPlayingAudio(false);
        } else {
            setIsPlayingAudio(false);
        }
    } catch (e) {
        console.error(e);
        setIsPlayingAudio(false);
    }
  };

  // --- Quiz Logic ---
  const startQuiz = async () => {
    setIsQuizLoading(true);
    setShowQuizResult(false);
    setQuizScore(0);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    try {
      const questions = await GeminiService.generateQuiz(quizTopic);
      setQuizQuestions(questions);
    } catch (e) {
      alert("Test tuzishda xatolik.");
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (selectedOption !== null) return; // Prevent changing answer
    setSelectedOption(optionIndex);
    
    if (optionIndex === quizQuestions[currentQuestionIndex].correctAnswer) {
      setQuizScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setShowQuizResult(true);
      }
    }, 2000);
  };


  // --- Views ---

  const renderHome = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Xush kelibsiz! 👋</h1>
        <p className="opacity-90">Ingliz tilini o'rganishni bugunoq boshlang. O'z darajangizni oshiring.</p>
        <div className="mt-4 flex gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 px-4">
                <span className="block text-xs opacity-70">Kunlik maqsad</span>
                <span className="font-semibold">15 daqiqa</span>
            </div>
             <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 px-4">
                <span className="block text-xs opacity-70">O'rganilgan so'zlar</span>
                <span className="font-semibold">12 ta</span>
            </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800">Bo'limlar</h2>
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setActiveTab(AppTab.LESSONS)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:bg-gray-50 transition">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><BookOpen size={24} /></div>
          <span className="font-semibold text-gray-700">Darslar</span>
        </button>
        <button onClick={() => setActiveTab(AppTab.VOCABULARY)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:bg-gray-50 transition">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><ImageIcon size={24} /></div>
          <span className="font-semibold text-gray-700">Lug'at</span>
        </button>
        <button onClick={() => setActiveTab(AppTab.CHAT)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:bg-gray-50 transition">
          <div className="p-3 bg-green-100 text-green-600 rounded-full"><MessageCircle size={24} /></div>
          <span className="font-semibold text-gray-700">AI Suhbat</span>
        </button>
        <button onClick={() => setActiveTab(AppTab.QUIZ)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:bg-gray-50 transition">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full"><BrainCircuit size={24} /></div>
          <span className="font-semibold text-gray-700">Test</span>
        </button>
      </div>
    </div>
  );

  const renderLessons = () => (
    <div className="h-full flex flex-col">
      {!selectedLesson ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Mavzular</h2>
          {lessonTopics.map(lesson => (
            <div key={lesson.id} onClick={() => loadLesson(lesson)} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-500 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{lesson.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{lesson.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${lesson.level === 'Beginner' ? 'bg-green-100 text-green-700' : lesson.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {lesson.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <button onClick={() => setSelectedLesson(null)} className="text-gray-500 hover:text-gray-800">
               &larr; Ortga
            </button>
            <h2 className="font-bold text-lg">{selectedLesson.title}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 prose prose-blue max-w-none">
            {isLessonLoading ? <LoadingSpinner /> : <ReactMarkdown>{lessonContent || ''}</ReactMarkdown>}
          </div>
        </div>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[600px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
        <h2 className="font-semibold flex items-center gap-2">
          <MessageCircle size={20} /> AI Tutor
        </h2>
        <span className="text-xs bg-indigo-500 px-2 py-1 rounded">Online</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-3 px-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isChatLoading && (
           <div className="flex justify-start">
             <div className="bg-gray-200 rounded-full px-4 py-2 text-gray-500 text-sm animate-pulse">
               Yozmoqda...
             </div>
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 bg-white border-t">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
          <input 
            type="text" 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ingliz tilida yozing..."
            className="flex-1 bg-transparent border-none focus:ring-0 p-2 outline-none text-gray-700"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isChatLoading}
            className={`p-2 rounded-full ${inputMessage.trim() ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-300 text-gray-500'}`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderVocabulary = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4">So'z boyligini oshirish</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={vocabWord}
            onChange={(e) => setVocabWord(e.target.value)}
            placeholder="So'z kiriting (masalan: Apple)"
            className="flex-1 border rounded-xl px-4 py-3 outline-none focus:border-blue-500 bg-gray-50"
          />
          <button 
            onClick={handleGenerateCard}
            disabled={isVocabLoading || !vocabWord}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {isVocabLoading ? '...' : 'Izlash'}
          </button>
        </div>
      </div>

      {isVocabLoading && <LoadingSpinner />}

      {currentCard && !isVocabLoading && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
           <div className="relative h-64 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {currentCard.imageUrl ? (
                  <img src={currentCard.imageUrl} alt={currentCard.word} className="w-full h-full object-cover" />
              ) : (
                  <ImageIcon size={48} className="text-gray-300" />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                 <h3 className="text-3xl font-bold text-white capitalize">{currentCard.word}</h3>
              </div>
           </div>
           <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h4 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-1">Tarjima</h4>
                    <p className="text-xl text-gray-800">{currentCard.definition}</p>
                 </div>
                 <button 
                    onClick={() => playPronunciation(currentCard.word)}
                    disabled={isPlayingAudio}
                    className="p-3 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition"
                 >
                    {isPlayingAudio ? <div className="w-6 h-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div> : <Volume2 size={24} />}
                 </button>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <h4 className="text-sm uppercase tracking-wide text-yellow-700 font-bold mb-1">Misol</h4>
                <p className="text-gray-700 italic">"{currentCard.example}"</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  const renderQuiz = () => (
    <div className="h-full flex flex-col">
       {!quizQuestions.length ? (
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center space-y-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600">
               <BrainCircuit size={32} />
            </div>
            <h2 className="text-xl font-bold">Bilimingizni sinab ko'ring</h2>
            <p className="text-gray-500">Mavzu tanlang va AI siz uchun test tuzib beradi.</p>
            
            <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
                {['General Grammar', 'Verbs', 'Prepositions', 'Idioms'].map(topic => (
                    <button 
                        key={topic}
                        onClick={() => { setQuizTopic(topic); }}
                        className={`p-3 rounded-lg border ${quizTopic === topic ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        {topic}
                    </button>
                ))}
            </div>

            <button 
                onClick={startQuiz}
                disabled={isQuizLoading}
                className="w-full max-w-md mx-auto bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 disabled:opacity-50"
            >
                {isQuizLoading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Tayyorlanmoqda...</span> : 'Boshlash'}
            </button>
         </div>
       ) : showQuizResult ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
             <h2 className="text-2xl font-bold mb-2">Natija</h2>
             <div className="text-5xl font-bold text-orange-600 mb-4">{quizScore} / {quizQuestions.length}</div>
             <p className="text-gray-500 mb-6">
                 {quizScore === quizQuestions.length ? "Mukammal! 🎉" : quizScore > quizQuestions.length / 2 ? "Yaxshi natija! 👍" : "Ko'proq shug'ullanish kerak. 💪"}
             </p>
             <button onClick={() => setQuizQuestions([])} className="bg-gray-800 text-white px-6 py-2 rounded-lg">Qayta ishlash</button>
          </div>
       ) : (
          <div className="flex flex-col h-full">
             <div className="mb-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Savol {currentQuestionIndex + 1} / {quizQuestions.length}</span>
                <span className="text-sm font-bold text-orange-600">Ball: {quizScore}</span>
             </div>
             
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-4">
                <h3 className="text-lg font-medium text-gray-800">{quizQuestions[currentQuestionIndex].question}</h3>
             </div>

             <div className="space-y-3">
                {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === quizQuestions[currentQuestionIndex].correctAnswer;
                    const showStatus = selectedOption !== null;
                    
                    let btnClass = "w-full p-4 rounded-xl border-2 text-left transition flex justify-between items-center ";
                    if (showStatus) {
                        if (isCorrect) btnClass += "border-green-500 bg-green-50 text-green-700";
                        else if (isSelected) btnClass += "border-red-500 bg-red-50 text-red-700";
                        else btnClass += "border-gray-100 opacity-50";
                    } else {
                        btnClass += "border-gray-100 hover:border-blue-200 hover:bg-blue-50";
                    }

                    return (
                        <button 
                            key={idx}
                            onClick={() => handleQuizAnswer(idx)}
                            disabled={selectedOption !== null}
                            className={btnClass}
                        >
                            <span>{option}</span>
                            {showStatus && isCorrect && <CheckCircle size={20} />}
                            {showStatus && isSelected && !isCorrect && <XCircle size={20} />}
                        </button>
                    )
                })}
             </div>

             {selectedOption !== null && (
                 <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                     <strong>Izoh:</strong> {quizQuestions[currentQuestionIndex].explanation}
                 </div>
             )}
          </div>
       )}
    </div>
  );

  // --- Layout ---

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 md:pb-0 md:pl-24">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">InglizPro AI</h1>
        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
             <img src="https://picsum.photos/100" alt="Avatar" />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-white border-r border-gray-200 flex-col items-center py-8 z-20">
         <div className="mb-10 text-blue-600">
            <BrainCircuit size={32} />
         </div>
         <nav className="space-y-8 flex flex-col w-full px-4">
            <button onClick={() => setActiveTab(AppTab.HOME)} className={`p-3 rounded-xl flex justify-center transition ${activeTab === AppTab.HOME ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
                <LayoutDashboard size={24} />
            </button>
            <button onClick={() => setActiveTab(AppTab.LESSONS)} className={`p-3 rounded-xl flex justify-center transition ${activeTab === AppTab.LESSONS ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
                <BookOpen size={24} />
            </button>
             <button onClick={() => setActiveTab(AppTab.VOCABULARY)} className={`p-3 rounded-xl flex justify-center transition ${activeTab === AppTab.VOCABULARY ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
                <ImageIcon size={24} />
            </button>
            <button onClick={() => setActiveTab(AppTab.CHAT)} className={`p-3 rounded-xl flex justify-center transition ${activeTab === AppTab.CHAT ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
                <MessageCircle size={24} />
            </button>
             <button onClick={() => setActiveTab(AppTab.QUIZ)} className={`p-3 rounded-xl flex justify-center transition ${activeTab === AppTab.QUIZ ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
                <BrainCircuit size={24} />
            </button>
         </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 md:py-8">
        {activeTab === AppTab.HOME && renderHome()}
        {activeTab === AppTab.LESSONS && renderLessons()}
        {activeTab === AppTab.CHAT && renderChat()}
        {activeTab === AppTab.VOCABULARY && renderVocabulary()}
        {activeTab === AppTab.QUIZ && renderQuiz()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 pb-safe z-20">
          <button onClick={() => setActiveTab(AppTab.HOME)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.HOME ? 'text-blue-600' : 'text-gray-400'}`}>
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Asosiy</span>
          </button>
           <button onClick={() => setActiveTab(AppTab.LESSONS)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.LESSONS ? 'text-blue-600' : 'text-gray-400'}`}>
            <BookOpen size={20} />
            <span className="text-[10px] font-medium">Dars</span>
          </button>
           <button onClick={() => setActiveTab(AppTab.VOCABULARY)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.VOCABULARY ? 'text-blue-600' : 'text-gray-400'}`}>
            <ImageIcon size={20} />
            <span className="text-[10px] font-medium">Lug'at</span>
          </button>
           <button onClick={() => setActiveTab(AppTab.CHAT)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.CHAT ? 'text-blue-600' : 'text-gray-400'}`}>
            <MessageCircle size={20} />
            <span className="text-[10px] font-medium">Suhbat</span>
          </button>
          <button onClick={() => setActiveTab(AppTab.QUIZ)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.QUIZ ? 'text-blue-600' : 'text-gray-400'}`}>
            <BrainCircuit size={20} />
            <span className="text-[10px] font-medium">Test</span>
          </button>
      </div>

    </div>
  );
};

export default App;