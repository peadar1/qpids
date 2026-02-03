import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';
import {
  Calendar,
  FileText,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Circle,
  Hash,
  Mail,
  Phone,
  Lock,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import Header from '../components/organizer/Header';

// Question type options
const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text', icon: Type, description: 'Single line text input' },
  { value: 'textarea', label: 'Long Text', icon: AlignLeft, description: 'Multi-line text area' },
  { value: 'select', label: 'Dropdown', icon: List, description: 'Single choice from dropdown' },
  { value: 'multi_select', label: 'Multi-Select', icon: CheckSquare, description: 'Multiple choices allowed' },
  { value: 'radio', label: 'Radio Buttons', icon: Circle, description: 'Single choice, all visible' },
  { value: 'checkbox', label: 'Checkboxes', icon: CheckSquare, description: 'Multiple choices, all visible' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address' },
  { value: 'phone', label: 'Phone', icon: Phone, description: 'Phone number' },
];

// Standard questions
const STANDARD_QUESTIONS = [
  { key: 'name', question_text: 'Full Name', question_type: 'text', is_required: true, canDisable: false },
  { key: 'email', question_text: 'Email Address', question_type: 'email', is_required: true, canDisable: false },
  { key: 'phone', question_text: 'Phone Number', question_type: 'phone', is_required: true, canDisable: true },
  { key: 'date_of_birth', question_text: 'Date of Birth', question_type: 'date', is_required: true, canDisable: false },
  { key: 'gender', question_text: 'I am', question_type: 'select', options: ['Male', 'Female', 'Non-binary', 'Other'], is_required: true, canDisable: false },
  { key: 'interested_in', question_text: 'Interested in', question_type: 'select', options: ['Men', 'Women', 'Everyone'], is_required: true, canDisable: false },
  { key: 'bio', question_text: 'Tell us about yourself', question_type: 'textarea', is_required: false, canDisable: true },
];

export default function CreateEvent() {
  const navigate = useNavigate();
  
  // Current step (1, 2, or 3)
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Event details
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    event_date: '',
  });
  
  // Step 2: Form configuration
  const [disabledStandardFields, setDisabledStandardFields] = useState([]);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({
    question_key: '',
    question_text: '',
    question_type: 'text',
    options: [],
    is_required: true,
  });
  const [optionInput, setOptionInput] = useState('');
  
  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step navigation
  const goToStep = (step) => {
    setError('');
    if (step === 2 && !validateStep1()) return;
    if (step === 3 && !validateStep2()) return;
    setCurrentStep(step);
  };

  const validateStep1 = () => {
    if (!eventData.name.trim()) {
      setError('Please enter an event name');
      return false;
    }
    if (!eventData.event_date) {
      setError('Please select an event date');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    // Form config is optional, always valid
    return true;
  };

  // Step 1 handlers
  const handleEventChange = (e) => {
    setEventData({
      ...eventData,
      [e.target.name]: e.target.value,
    });
  };

  // Step 2 handlers
  const toggleStandardField = (fieldKey) => {
    if (disabledStandardFields.includes(fieldKey)) {
      setDisabledStandardFields(disabledStandardFields.filter(k => k !== fieldKey));
    } else {
      setDisabledStandardFields([...disabledStandardFields, fieldKey]);
    }
  };

  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    setQuestionFormData({
      ...questionFormData,
      [name]: value,
    });
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setQuestionFormData({
        ...questionFormData,
        options: [...questionFormData.options, optionInput.trim()],
      });
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index) => {
    setQuestionFormData({
      ...questionFormData,
      options: questionFormData.options.filter((_, i) => i !== index),
    });
  };

  const generateQuestionKey = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      question_key: '',
      question_text: '',
      question_type: 'text',
      options: [],
      is_required: true,
    });
    setOptionInput('');
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleAddQuestion = () => {
    if (!questionFormData.question_text.trim()) {
      setError('Please enter a question');
      return;
    }
    
    if (['select', 'multi_select', 'radio', 'checkbox'].includes(questionFormData.question_type) && questionFormData.options.length < 2) {
      setError('Please add at least 2 options');
      return;
    }

    const questionKey = questionFormData.question_key || generateQuestionKey(questionFormData.question_text);
    
    const newQuestion = {
      ...questionFormData,
      question_key: questionKey,
    };

    if (editingIndex !== null) {
      const updated = [...customQuestions];
      updated[editingIndex] = newQuestion;
      setCustomQuestions(updated);
    } else {
      setCustomQuestions([...customQuestions, newQuestion]);
    }
    
    resetQuestionForm();
    setError('');
  };

  const handleEditQuestion = (index) => {
    const question = customQuestions[index];
    setQuestionFormData({
      question_key: question.question_key,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || [],
      is_required: question.is_required,
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDeleteQuestion = (index) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...customQuestions];
    if (direction === 'up' && index > 0) {
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    } else if (direction === 'down' && index < customQuestions.length - 1) {
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    }
    setCustomQuestions(newQuestions);
  };

  // Final submit
  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Create the event with settings
      const response = await eventAPI.create({
        ...eventData,
        settings: {
          disabled_standard_fields: disabledStandardFields,
        },
      });

      const eventId = response.data.id;

      // Create custom questions if any
      if (customQuestions.length > 0) {
        const { formQuestionAPI } = await import('../services/api');
        
        for (let i = 0; i < customQuestions.length; i++) {
          await formQuestionAPI.create(eventId, {
            ...customQuestions[i],
            display_order: i + 1,
            is_active: true,
          });
        }
      }

      // Navigate to the event page
      navigate(`/organizer/events/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create event');
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const typeConfig = QUESTION_TYPES.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : Type;
  };

  // Get active standard questions for preview
  const activeStandardQuestions = STANDARD_QUESTIONS.filter(q => !disabledStandardFields.includes(q.key));

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      <Header activePage="events" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/organizer/events')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Events
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-gradient-to-br from-pink-400 to-red-400 p-3 rounded-2xl">
              <Sparkles className="text-white" size={28} />
            </div>
            <h2 className="text-4xl font-bold text-gray-800">Create New Event</h2>
          </div>
          <p className="text-gray-600">Set up your cupid matching event in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Event Details', icon: Calendar },
              { num: 2, label: 'Registration Form', icon: FileText },
              { num: 3, label: 'Review & Create', icon: Check },
            ].map((step, index) => (
              <div key={step.num} className="flex items-center">
                <div 
                  className={`flex items-center gap-3 cursor-pointer ${currentStep >= step.num ? 'opacity-100' : 'opacity-50'}`}
                  onClick={() => currentStep > step.num && goToStep(step.num)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    currentStep > step.num 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.num 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.num ? <Check size={20} /> : step.num}
                  </div>
                  <span className={`font-medium hidden sm:block ${currentStep === step.num ? 'text-pink-600' : 'text-gray-600'}`}>
                    {step.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`w-12 sm:w-24 h-1 mx-2 sm:mx-4 rounded ${currentStep > step.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-pink-100">
          
          {/* STEP 1: Event Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Event Details</h3>
              
              {/* Event Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={eventData.name}
                  onChange={handleEventChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                  placeholder="Valentine's Day 2026"
                  required
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Event Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    name="event_date"
                    value={eventData.event_date}
                    onChange={handleEventChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={eventData.description}
                  onChange={handleEventChange}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all resize-none"
                  placeholder="Tell participants about your event..."
                />
              </div>
            </div>
          )}

          {/* STEP 2: Registration Form */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Registration Form</h3>
                  <p className="text-gray-600 text-sm mt-1">Configure what participants will see when registering</p>
                </div>
                <button
                  onClick={() => {
                    resetQuestionForm();
                    setShowAddForm(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                >
                  <Plus size={18} />
                  Add Question
                </button>
              </div>

              {/* Add/Edit Question Form */}
              {showAddForm && (
                <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-6 mb-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-4">
                    {editingIndex !== null ? 'Edit Question' : 'Add Custom Question'}
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Question Text *</label>
                      <input
                        type="text"
                        name="question_text"
                        value={questionFormData.question_text}
                        onChange={handleQuestionChange}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-pink-400 outline-none"
                        placeholder="What's your favorite hobby?"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Question Type</label>
                        <select
                          name="question_type"
                          value={questionFormData.question_type}
                          onChange={handleQuestionChange}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-pink-400 outline-none"
                        >
                          {QUESTION_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3 pt-7">
                        <button
                          type="button"
                          onClick={() => setQuestionFormData({ ...questionFormData, is_required: !questionFormData.is_required })}
                          className={`p-1 rounded-full transition-colors ${questionFormData.is_required ? 'text-pink-500' : 'text-gray-400'}`}
                        >
                          {questionFormData.is_required ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                        <span className="text-sm font-medium text-gray-700">Required</span>
                      </div>
                    </div>

                    {/* Options for select types */}
                    {['select', 'multi_select', 'radio', 'checkbox'].includes(questionFormData.question_type) && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Options *</label>
                        <div className="space-y-2 mb-2">
                          {questionFormData.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="flex-1 px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm">{opt}</span>
                              <button onClick={() => handleRemoveOption(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={optionInput}
                            onChange={(e) => setOptionInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                            className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-pink-400 outline-none text-sm"
                            placeholder="Add option..."
                          />
                          <button onClick={handleAddOption} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium">
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAddQuestion}
                        className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm"
                      >
                        <Check size={16} />
                        {editingIndex !== null ? 'Update' : 'Add'}
                      </button>
                      <button
                        onClick={resetQuestionForm}
                        className="flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Questions */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-pink-500" />
                  Standard Questions
                </h4>
                <div className="bg-gray-50 rounded-xl border-2 border-gray-100 overflow-hidden">
                  {STANDARD_QUESTIONS.map((q, index) => {
                    const isDisabled = disabledStandardFields.includes(q.key);
                    return (
                      <div 
                        key={index}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 ${isDisabled ? 'opacity-50' : ''}`}
                      >
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${isDisabled ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                            {q.question_text}
                          </p>
                          <p className="text-xs text-gray-500">{q.question_type}</p>
                        </div>
                        {q.canDisable ? (
                          <button
                            onClick={() => toggleStandardField(q.key)}
                            className={`p-1 rounded transition-colors ${!isDisabled ? 'text-green-500' : 'text-gray-400'}`}
                          >
                            {!isDisabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Lock size={14} />
                            <span className="text-xs">Required</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Questions */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Plus size={16} className="text-pink-500" />
                  Custom Questions ({customQuestions.length})
                </h4>
                {customQuestions.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                    <p className="text-gray-500 text-sm">No custom questions yet. Click "Add Question" to create one.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border-2 border-pink-100 overflow-hidden">
                    {customQuestions.map((q, index) => {
                      const TypeIcon = getTypeIcon(q.question_type);
                      return (
                        <div key={index} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMoveQuestion(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => handleMoveQuestion(index, 'down')}
                              disabled={index === customQuestions.length - 1}
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                          <div className="bg-pink-100 p-1.5 rounded-lg">
                            <TypeIcon size={16} className="text-pink-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">{q.question_text}</p>
                            <p className="text-xs text-gray-500">
                              {q.question_type}
                              {q.is_required && ' • Required'}
                              {q.options?.length > 0 && ` • ${q.options.length} options`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEditQuestion(index)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Review & Create */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Review & Create</h3>
              
              {/* Event Summary */}
              <div className="bg-pink-50 rounded-2xl p-6 border-2 border-pink-100">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-pink-500" />
                  Event Details
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-800">{eventData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(eventData.event_date).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </span>
                  </div>
                  {eventData.description && (
                    <div className="pt-2 border-t border-pink-200 mt-2">
                      <span className="text-gray-600 text-sm">{eventData.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Summary */}
              <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-100">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-purple-500" />
                  Registration Form
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Standard fields:</span>
                    <span className="font-medium text-gray-800">
                      {activeStandardQuestions.length} of {STANDARD_QUESTIONS.length} enabled
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Custom questions:</span>
                    <span className="font-medium text-gray-800">{customQuestions.length}</span>
                  </div>
                  {disabledStandardFields.length > 0 && (
                    <div className="pt-2 border-t border-purple-200 mt-2">
                      <span className="text-gray-600 text-sm">
                        Disabled: {disabledStandardFields.map(f => STANDARD_QUESTIONS.find(q => q.key === f)?.question_text).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Next steps:</strong> After creating your event, you can add venues, open registration, and start collecting participants!
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-100">
            <button
              onClick={() => currentStep > 1 ? goToStep(currentStep - 1) : navigate('/organizer/events')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft size={18} />
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => goToStep(currentStep + 1)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Next
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Create Event
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}