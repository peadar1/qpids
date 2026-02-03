import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, formQuestionAPI } from '../services/api';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  FileText,
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown,
  Eye,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Circle,
  Hash,
  Mail,
  Phone,
  Lock
} from 'lucide-react';
import Header from '../components/organizer/Header';

// Question type options with icons
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

// Default standard questions that come with every event
const STANDARD_QUESTIONS = [
  { key: 'name', question_text: 'Full Name', question_type: 'text', is_required: true, canDisable: false },
  { key: 'email', question_text: 'Email Address', question_type: 'email', is_required: true, canDisable: false },
  { key: 'phone', question_text: 'Phone Number', question_type: 'phone', is_required: true, canDisable: true },
  { key: 'date_of_birth', question_text: 'Date of Birth', question_type: 'date', is_required: true, canDisable: false },
  { key: 'gender', question_text: 'I am', question_type: 'select', options: ['Male', 'Female', 'Non-binary', 'Other'], is_required: true, canDisable: false },
  { key: 'interested_in', question_text: 'Interested in', question_type: 'select', options: ['Men', 'Women', 'Everyone'], is_required: true, canDisable: false },
  { key: 'bio', question_text: 'Tell us about yourself', question_type: 'textarea', is_required: false, canDisable: true },
];

export default function FormBuilder() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Track which standard fields are disabled
  const [disabledStandardFields, setDisabledStandardFields] = useState([]);
  
  const [formData, setFormData] = useState({
    question_key: '',
    question_text: '',
    question_type: 'text',
    options: [],
    is_required: true,
    is_active: true,
  });
  
  const [optionInput, setOptionInput] = useState('');

  useEffect(() => {
    fetchEventAndQuestions();
  }, [eventId]);

  const fetchEventAndQuestions = async () => {
    try {
      setError(''); // Clear any previous errors
      const [eventRes, questionsRes] = await Promise.all([
        eventAPI.getById(eventId),
        formQuestionAPI.getAll(eventId)
      ]);
      setEvent(eventRes.data);
      setQuestions(questionsRes.data);

      // Load disabled standard fields from event settings
      const settings = eventRes.data.settings || {};
      setDisabledStandardFields(settings.disabled_standard_fields || []);

      setLoading(false);
    } catch (err) {
      setError('Failed to load form questions');
      setLoading(false);
    }
  };

  const toggleStandardField = async (fieldKey) => {
    const newDisabled = disabledStandardFields.includes(fieldKey)
      ? disabledStandardFields.filter(k => k !== fieldKey)
      : [...disabledStandardFields, fieldKey];
    
    setDisabledStandardFields(newDisabled);
    
    // Save to event settings
    try {
      await eventAPI.update(eventId, {
        settings: {
          ...event.settings,
          disabled_standard_fields: newDisabled
        }
      });
    } catch (err) {
      setError('Failed to save settings');
      // Revert on error
      setDisabledStandardFields(disabledStandardFields);
    }
  };

  const resetForm = () => {
    setFormData({
      question_key: '',
      question_text: '',
      question_type: 'text',
      options: [],
      is_required: true,
      is_active: true,
    });
    setOptionInput('');
    setShowAddForm(false);
    setEditingId(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, optionInput.trim()],
      });
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const generateQuestionKey = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    
    // Auto-generate question_key if not provided
    const questionKey = formData.question_key || generateQuestionKey(formData.question_text);
    
    // Validate options for select/multi-select types
    if (['select', 'multi_select', 'radio', 'checkbox'].includes(formData.question_type) && formData.options.length < 2) {
      setError('Please add at least 2 options for this question type');
      return;
    }
    
    try {
      await formQuestionAPI.create(eventId, {
        ...formData,
        question_key: questionKey,
        display_order: questions.filter(q => !q.is_standard).length + 1,
      });
      fetchEventAndQuestions();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create question');
    }
  };

  const handleEdit = (question) => {
    setEditingId(question.id);
    setFormData({
      question_key: question.question_key,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || [],
      is_required: question.is_required,
      is_active: question.is_active,
    });
    setShowAddForm(false);
  };

  const handleUpdate = async (questionId) => {
    setError('');
    
    if (['select', 'multi_select', 'radio', 'checkbox'].includes(formData.question_type) && formData.options.length < 2) {
      setError('Please add at least 2 options for this question type');
      return;
    }
    
    try {
      await formQuestionAPI.update(eventId, questionId, formData);
      fetchEventAndQuestions();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update question');
    }
  };

  const handleDelete = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await formQuestionAPI.delete(eventId, questionId);
        fetchEventAndQuestions();
      } catch (err) {
        setError('Failed to delete question');
      }
    }
  };

  const handleToggleActive = async (question) => {
    try {
      await formQuestionAPI.update(eventId, question.id, {
        is_active: !question.is_active,
      });
      fetchEventAndQuestions();
    } catch (err) {
      setError('Failed to update question');
    }
  };

  const handleMoveQuestion = async (questionId, direction) => {
    const customQuestions = questions.filter(q => !q.is_standard);
    const index = customQuestions.findIndex(q => q.id === questionId);
    
    if (direction === 'up' && index > 0) {
      // Swap with previous
      const newOrder = [...customQuestions];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      await updateQuestionOrder(newOrder);
    } else if (direction === 'down' && index < customQuestions.length - 1) {
      // Swap with next
      const newOrder = [...customQuestions];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      await updateQuestionOrder(newOrder);
    }
  };

  const updateQuestionOrder = async (orderedQuestions) => {
    try {
      await formQuestionAPI.reorder(eventId, orderedQuestions.map((q, i) => ({
        id: q.id,
        display_order: i + 1,
      })));
      fetchEventAndQuestions();
    } catch (err) {
      setError('Failed to reorder questions');
    }
  };

  const getTypeIcon = (type) => {
    const typeConfig = QUESTION_TYPES.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : Type;
  };

  // Separate standard and custom questions
  const standardQuestions = questions.filter(q => q.is_standard);
  const customQuestions = questions.filter(q => !q.is_standard).sort((a, b) => a.display_order - b.display_order);

  // Get active standard questions for preview
  const activeStandardQuestions = STANDARD_QUESTIONS.filter(q => !disabledStandardFields.includes(q.key));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading form builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      <Header activePage="events" />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button & Header */}
        <button
          onClick={() => navigate(`/organizer/events/${eventId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Event
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">Registration Form</h2>
            <p className="text-gray-600">{event?.name}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                previewMode 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-white border-2 border-pink-200 text-pink-600 hover:bg-pink-50'
              }`}
            >
              <Eye size={18} />
              {previewMode ? 'Edit Mode' : 'Preview'}
            </button>
            
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  question_key: '',
                  question_text: '',
                  question_type: 'text',
                  options: [],
                  is_required: true,
                  is_active: true,
                });
                setOptionInput('');
                setError('');
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Plus size={20} />
              Add Question
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && !previewMode && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-pink-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingId ? 'Edit Question' : 'Add New Question'}
            </h3>
            
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleAdd} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Question Text */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Question Text *
                  </label>
                  <input
                    type="text"
                    name="question_text"
                    value={formData.question_text}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                    placeholder="What is your favorite hobby?"
                    required
                  />
                </div>

                {/* Question Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Question Type *
                  </label>
                  <select
                    name="question_type"
                    value={formData.question_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                    required
                  >
                    {QUESTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question Key */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Question Key (optional)
                  </label>
                  <input
                    type="text"
                    name="question_key"
                    value={formData.question_key}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                    placeholder="Auto-generated if empty"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used internally for data storage</p>
                </div>
              </div>

              {/* Options (for select, multi_select, radio, checkbox) */}
              {['select', 'multi_select', 'radio', 'checkbox'].includes(formData.question_type) && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Options *
                  </label>
                  <div className="space-y-2 mb-3">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex-1 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg">
                          {option}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={18} />
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
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                      placeholder="Add an option..."
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_required: !formData.is_required })}
                  className={`p-1 rounded-full transition-colors ${formData.is_required ? 'text-pink-500' : 'text-gray-400'}`}
                >
                  {formData.is_required ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
                <span className="font-medium text-gray-700">Required question</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Save size={20} />
                  {editingId ? 'Update Question' : 'Add Question'}
                </button>
                
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  <X size={20} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Preview Mode */}
        {previewMode ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-pink-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Form Preview</h3>
            <div className="space-y-6">
              {/* Standard Questions Preview - only show active ones */}
              {activeStandardQuestions.map((q, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    {q.question_text} {q.is_required && <span className="text-red-500">*</span>}
                  </label>
                  {q.question_type === 'select' ? (
                    <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50" disabled>
                      <option>Select...</option>
                      {q.options?.map((opt, i) => <option key={i}>{opt}</option>)}
                    </select>
                  ) : q.question_type === 'textarea' ? (
                    <textarea 
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50" 
                      rows={3}
                      placeholder={`Enter ${q.question_text.toLowerCase()}`}
                      disabled 
                    />
                  ) : (
                    <input 
                      type={q.question_type} 
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50" 
                      placeholder={`Enter ${q.question_text.toLowerCase()}`}
                      disabled 
                    />
                  )}
                </div>
              ))}
              
              {/* Custom Questions Preview */}
              {customQuestions.filter(q => q.is_active).map((q) => (
                <div key={q.id} className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    {q.question_text} {q.is_required && <span className="text-red-500">*</span>}
                  </label>
                  {renderPreviewInput(q)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Standard Questions (toggleable) */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-pink-500" />
                Standard Questions
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                These are the core questions for matching. Some can be toggled on/off.
              </p>
              <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
                {STANDARD_QUESTIONS.map((q, index) => {
                  const isDisabled = disabledStandardFields.includes(q.key);
                  return (
                    <div 
                      key={index}
                      className={`flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0 ${
                        isDisabled ? 'bg-gray-50 opacity-60' : 'bg-white'
                      }`}
                    >
                      <div className="text-gray-400">
                        <GripVertical size={20} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${isDisabled ? 'text-gray-500' : 'text-gray-800'}`}>
                          {q.question_text}
                        </p>
                        <p className="text-sm text-gray-500">
                          {q.question_type} 
                          {q.is_required && !isDisabled && ' • Required'} 
                          {' • Standard'}
                        </p>
                      </div>
                      
                      {q.canDisable ? (
                        <button
                          onClick={() => toggleStandardField(q.key)}
                          className={`p-2 rounded-lg transition-colors ${
                            !isDisabled 
                              ? 'text-green-500 hover:bg-green-50' 
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={isDisabled ? 'Enable this field' : 'Disable this field'}
                        >
                          {!isDisabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock size={16} className="text-gray-400" />
                          <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">
                            Required
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Questions */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-pink-500" />
                Custom Questions
              </h3>
              
              {customQuestions.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-pink-100">
                  <div className="bg-gradient-to-br from-pink-100 to-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="text-pink-600" size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">No custom questions yet</h3>
                  <p className="text-gray-600 mb-6">
                    Add custom questions to learn more about your participants
                  </p>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        question_key: '',
                        question_text: '',
                        question_type: 'text',
                        options: [],
                        is_required: true,
                        is_active: true,
                      });
                      setOptionInput('');
                      setError('');
                      setShowAddForm(true);
                    }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus size={20} />
                    Add Your First Question
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-pink-100 overflow-hidden">
                  {customQuestions.map((question, index) => {
                    const TypeIcon = getTypeIcon(question.question_type);
                    return (
                      <div 
                        key={question.id}
                        className={`flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0 ${
                          !question.is_active ? 'bg-gray-50 opacity-60' : ''
                        }`}
                      >
                        {/* Drag Handle & Reorder */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveQuestion(question.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(question.id, 'down')}
                            disabled={index === customQuestions.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        
                        {/* Type Icon */}
                        <div className="bg-pink-100 p-2 rounded-lg">
                          <TypeIcon size={20} className="text-pink-600" />
                        </div>
                        
                        {/* Question Info */}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{question.question_text}</p>
                          <p className="text-sm text-gray-500">
                            {question.question_type}
                            {question.is_required && ' • Required'}
                            {question.options?.length > 0 && ` • ${question.options.length} options`}
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(question)}
                            className={`p-2 rounded-lg transition-colors ${
                              question.is_active 
                                ? 'text-green-500 hover:bg-green-50' 
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={question.is_active ? 'Disable' : 'Enable'}
                          >
                            {question.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>
                          
                          <button
                            onClick={() => handleEdit(question)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(question.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Helper function to render preview inputs
function renderPreviewInput(question) {
  switch (question.question_type) {
    case 'textarea':
      return (
        <textarea 
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50" 
          rows={3}
          placeholder={`Enter ${question.question_text.toLowerCase()}`}
          disabled 
        />
      );
    case 'select':
      return (
        <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50" disabled>
          <option>Select...</option>
          {question.options?.map((opt, i) => <option key={i}>{opt}</option>)}
        </select>
      );
    case 'multi_select':
    case 'checkbox':
      return (
        <div className="space-y-2">
          {question.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="checkbox" disabled className="w-4 h-4" />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {question.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" disabled className="w-4 h-4" />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    default:
      return (
        <input 
          type={question.question_type} 
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50" 
          placeholder={`Enter ${question.question_text.toLowerCase()}`}
          disabled 
        />
      );
  }
}