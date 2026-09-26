import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Loader2, BookOpen, Save, X, ImagePlus } from 'lucide-react';
import { cmsAPI, getApiErrorMessage, getImageUrl, uploadAPI } from '../../services/api';
import SimpleMarkdownEditor from '../../components/SimpleMarkdownEditor';

const DEFAULT_BLOG = {
  id: '',
  slug: '',
  title: '',
  date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  author: 'X-Space360 Editorial',
  readTime: '5 min read',
  excerpt: '',
  imageUrl: '',
  content: '',
  seoTitle: '',
  seoDescription: '',
  tableData: null,
  faqs: []
};

const BlogManagementAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await cmsAPI.getAdminContent();
      const allContent = res.data?.content || [];
      const blogSection = allContent.find(item => item.section === 'blog');
      const fetchedPosts = blogSection?.content_data?.posts || [];
      setPosts(fetchedPosts);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load blog posts.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (postToSave) => {
    setSaving(true);
    try {
      let updatedPosts = [...posts];
      const normalizedImageUrl = postToSave.imageUrl || postToSave.image_url || '';
      const normalizedPost = {
        ...postToSave,
        imageUrl: normalizedImageUrl,
        image_url: normalizedImageUrl,
      };
      const isNew = !normalizedPost.id;
      
      if (isNew) {
        normalizedPost.id = 'p' + Date.now();
        updatedPosts.push(normalizedPost);
      } else {
        updatedPosts = updatedPosts.map(p => p.id === normalizedPost.id ? normalizedPost : p);
      }

      const res = await cmsAPI.getAdminContent();
      const allContent = res.data?.content || [];
      const blogSection = allContent.find(item => item.section === 'blog');

      if (blogSection) {
        await cmsAPI.updateContent(blogSection.content_id, {
          content_data: { posts: updatedPosts }
        });
      } else {
        await cmsAPI.createContent({
          page: 'blog',
          section: 'blog',
          content_type: 'object',
          content_data: { posts: updatedPosts }
        });
      }
      
      setPosts(updatedPosts);
      setEditingPost(null);
      setMessage('Blog post saved successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error saving blog post.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog post? It will be removed permanently.')) return;
    setSaving(true);
    try {
      const updatedPosts = posts.filter(p => p.id !== id);
      const res = await cmsAPI.getAdminContent();
      const allContent = res.data?.content || [];
      const blogSection = allContent.find(item => item.section === 'blog');

      if (blogSection) {
        await cmsAPI.updateContent(blogSection.content_id, {
          content_data: { posts: updatedPosts }
        });
      }
      setPosts(updatedPosts);
      setMessage('Blog post deleted.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error deleting blog post.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-terracotta" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-charcoal flex items-center gap-2">
            <BookOpen className="text-terracotta" size={28} />
            Blog Management
          </h1>
          <p className="text-charcoal-muted mt-1">Manage public blog posts, SEO, and FAQs.</p>
        </div>
        {!editingPost && (
          <button
            onClick={() => setEditingPost({ ...DEFAULT_BLOG })}
            className="flex items-center gap-2 bg-terracotta text-white px-4 py-2 rounded-xl hover:bg-terracotta-dark font-medium transition"
          >
            <Plus size={20} />
            Add New Blog
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl border font-medium ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('error') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {message}
        </div>
      )}

      {editingPost ? (
        <BlogForm 
          post={editingPost} 
          onSave={handleSave} 
          onCancel={() => setEditingPost(null)}
          isSaving={saving}
          generateSlug={generateSlug}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {posts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No blog posts found. Click "Add New Blog" to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {posts.map(post => (
                <div key={post.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    {(post.imageUrl || post.image_url) ? (
                      <img src={getImageUrl(post.imageUrl || post.image_url)} alt={post.title} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <BookOpen size={24} className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-charcoal">{post.title || 'Untitled Post'}</h3>
                      <p className="text-sm text-gray-500">/{post.slug}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{post.date}</span>
                        <span>•</span>
                        <span>{post.author}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingPost(post)}
                      className="p-2 text-gray-500 hover:text-terracotta hover:bg-terracotta/10 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BlogForm = ({ post: initialPost, onSave, onCancel, isSaving, generateSlug }) => {
  const [post, setPost] = useState(() => ({
    ...initialPost,
    imageUrl: initialPost.imageUrl || initialPost.image_url || initialPost.featuredImage || '',
  }));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPost(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'imageUrl' ? { image_url: value } : {}),
      ...(name === 'title' && !prev.id ? { slug: generateSlug(value) } : {})
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(file.name)) {
      setImageUploadError('Please select a valid image file.');
      return;
    }

    setUploadingImage(true);
    setImageUploadError('');
    try {
      const uploaded = await uploadAPI.uploadCMSImage(file);
      setPost(prev => ({
        ...prev,
        imageUrl: uploaded.url,
        image_url: uploaded.url,
      }));
    } catch (error) {
      setImageUploadError(getApiErrorMessage(error, 'Image upload failed. Please try another image.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFaqChange = (index, field, value) => {
    const newFaqs = [...(post.faqs || [])];
    newFaqs[index] = { ...newFaqs[index], [field]: value };
    setPost(prev => ({ ...prev, faqs: newFaqs }));
  };

  const addFaq = () => {
    setPost(prev => ({ ...prev, faqs: [...(prev.faqs || []), { question: '', answer: '' }] }));
  };

  const removeFaq = (index) => {
    const newFaqs = [...(post.faqs || [])];
    newFaqs.splice(index, 1);
    setPost(prev => ({ ...prev, faqs: newFaqs }));
  };

  const insertTableTemplate = () => {
    const tableTemplate = `\n\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data A | Data B | Data C |\n| Data X | Data Y | Data Z |\n\n`;
    setPost(prev => ({ ...prev, content: (prev.content || '') + tableTemplate }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-8 mt-4 animate-scale-in">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-charcoal">
          {post.id ? 'Edit Blog Post' : 'Create New Blog Post'}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onCancel}
            disabled={isSaving}
            type="button"
            className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(post)}
            disabled={isSaving || !post.title || !post.slug}
            className="flex items-center gap-2 bg-amber-500 text-white px-6 py-2 rounded-xl hover:bg-amber-600 font-bold transition shadow-sm shadow-amber-500/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Post
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
            <input 
              type="text" name="title" value={post.title} onChange={handleChange} 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none"
              placeholder="e.g. 10 Best Villas in Nashik"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content Editor</label>
            <SimpleMarkdownEditor
              value={post.content || ''}
              onChange={handleChange}
              placeholder="Write your blog content here... Use toolbar buttons above to format H1, H2, Bold, Lists, Tables easily!"
              rows={14}
            />
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700">Dedicated Table</label>
              <button 
                type="button" 
                onClick={() => {
                  if (post.tableData) {
                    setPost(prev => ({ ...prev, tableData: null }));
                  } else {
                    setPost(prev => ({ ...prev, tableData: { title: '', headers: ['Column 1', 'Column 2'], rows: [['', '']] } }));
                  }
                }}
                className="text-xs font-bold text-terracotta bg-terracotta/10 px-3 py-1.5 rounded-lg hover:bg-terracotta/20 transition"
              >
                {post.tableData ? '- Remove Table' : '+ Add Table'}
              </button>
            </div>
            
            {post.tableData && (
              <div className="space-y-4 p-4 bg-gray-50 border border-gray-100 rounded-xl mb-4">
                <div>
                  <input 
                    type="text" 
                    value={post.tableData.title || ''} 
                    onChange={e => setPost(prev => ({ ...prev, tableData: { ...prev.tableData, title: e.target.value } }))}
                    placeholder="Table Title (Optional)"
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-terracotta font-semibold"
                  />
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        {post.tableData.headers.map((header, colIndex) => (
                          <th key={colIndex} className="border border-gray-200 p-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                value={header}
                                onChange={e => {
                                  const newHeaders = [...post.tableData.headers];
                                  newHeaders[colIndex] = e.target.value;
                                  setPost(prev => ({ ...prev, tableData: { ...prev.tableData, headers: newHeaders } }));
                                }}
                                className="w-full font-bold outline-none bg-transparent border-b border-dashed border-gray-300 focus:border-terracotta"
                                placeholder="Header"
                              />
                              {post.tableData.headers.length > 1 && (
                                <button type="button" onClick={() => {
                                  setPost(prev => {
                                    const newHeaders = [...prev.tableData.headers];
                                    newHeaders.splice(colIndex, 1);
                                    const newRows = prev.tableData.rows.map(r => { const nr = [...r]; nr.splice(colIndex, 1); return nr; });
                                    return { ...prev, tableData: { ...prev.tableData, headers: newHeaders, rows: newRows } };
                                  });
                                }} className="text-red-500 hover:text-red-700 font-bold px-1" title="Remove Column">×</button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="border border-gray-200 p-2 w-10 text-center">
                          <button type="button" onClick={() => {
                            setPost(prev => {
                              const newHeaders = [...prev.tableData.headers, `Column ${prev.tableData.headers.length + 1}`];
                              const newRows = prev.tableData.rows.map(r => [...r, '']);
                              return { ...prev, tableData: { ...prev.tableData, headers: newHeaders, rows: newRows } };
                            });
                          }} className="text-terracotta hover:text-terracotta-dark font-bold text-lg" title="Add Column">+</button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {post.tableData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, colIndex) => (
                            <td key={colIndex} className="border border-gray-200 p-2">
                              <input 
                                type="text"
                                value={cell}
                                onChange={e => {
                                  setPost(prev => {
                                    const newRows = [...prev.tableData.rows];
                                    newRows[rowIndex] = [...newRows[rowIndex]];
                                    newRows[rowIndex][colIndex] = e.target.value;
                                    return { ...prev, tableData: { ...prev.tableData, rows: newRows } };
                                  });
                                }}
                                className="w-full outline-none bg-transparent"
                                placeholder="Value"
                              />
                            </td>
                          ))}
                          <td className="border border-gray-200 p-2 text-center">
                            {post.tableData.rows.length > 1 && (
                              <button type="button" onClick={() => {
                                setPost(prev => {
                                  const newRows = [...prev.tableData.rows];
                                  newRows.splice(rowIndex, 1);
                                  return { ...prev, tableData: { ...prev.tableData, rows: newRows } };
                                });
                              }} className="text-red-500 hover:text-red-700 font-bold px-1" title="Remove Row">×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 text-right">
                    <button type="button" onClick={() => {
                      setPost(prev => {
                        const newRow = new Array(prev.tableData.headers.length).fill('');
                        return { ...prev, tableData: { ...prev.tableData, rows: [...prev.tableData.rows, newRow] } };
                      });
                    }} className="text-xs font-bold text-white bg-terracotta px-3 py-1.5 rounded-lg hover:bg-terracotta-dark transition">
                      + Add Row
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700">Frequently Asked Questions (FAQs)</label>
              <button 
                type="button" 
                onClick={addFaq}
                className="text-xs font-bold text-terracotta bg-terracotta/10 px-3 py-1.5 rounded-lg hover:bg-terracotta/20 transition"
              >
                + Add FAQ
              </button>
            </div>
            <div className="space-y-4">
              {(!post.faqs || post.faqs.length === 0) ? (
                <p className="text-sm text-gray-400 italic">No FAQs added yet.</p>
              ) : (
                post.faqs.map((faq, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-xl relative">
                    <button 
                      type="button" onClick={() => removeFaq(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition"
                    >
                      <X size={16} />
                    </button>
                    <div className="space-y-3 pr-6">
                      <input 
                        type="text" 
                        value={faq.question} 
                        onChange={(e) => handleFaqChange(idx, 'question', e.target.value)} 
                        placeholder="Question"
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-terracotta"
                      />
                      <textarea 
                        value={faq.answer} 
                        onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)} 
                        placeholder="Answer"
                        rows={2}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-terracotta"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 bg-gray-50 p-5 rounded-2xl border border-gray-100 h-fit">
          <h3 className="font-bold text-charcoal border-b border-gray-200 pb-2">Meta & Details</h3>
          
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">URL Slug</label>
            <input 
              type="text" name="slug" value={post.slug} onChange={handleChange} 
              className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Author</label>
            <input 
              type="text" name="author" value={post.author} onChange={handleChange} 
              className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
              <input 
                type="text" name="date" value={post.date} onChange={handleChange} 
                className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Read Time</label>
              <input 
                type="text" name="readTime" value={post.readTime} onChange={handleChange} 
                className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Cover Image URL</label>
            <input 
              type="text" name="imageUrl" value={post.imageUrl} onChange={handleChange} 
              placeholder="https://..."
              className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
            />
            <div className="my-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span className="h-px flex-1 bg-gray-200" /> or upload from device <span className="h-px flex-1 bg-gray-200" />
            </div>
            <label className={`flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold transition ${uploadingImage ? 'cursor-wait border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-300 bg-white text-gray-600 hover:border-terracotta hover:text-terracotta'}`}>
              {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              {uploadingImage ? 'Uploading image...' : 'Upload Cover Image'}
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="sr-only"
              />
            </label>
            <p className="mt-1 text-[10px] text-gray-500">Any standard image format, up to 25 MB. It will be optimized automatically.</p>
            {imageUploadError && <p className="mt-1 text-xs font-medium text-red-600">{imageUploadError}</p>}
            {post.imageUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <img src={getImageUrl(post.imageUrl)} alt="Cover preview" className="h-32 w-full object-cover" />
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate text-[10px] text-gray-500">Blog cover preview</span>
                  <button type="button" onClick={() => setPost(prev => ({ ...prev, imageUrl: '', image_url: '' }))} className="text-xs font-bold text-red-600 hover:text-red-700">Remove</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Excerpt (Short Summary)</label>
            <textarea 
              name="excerpt" value={post.excerpt} onChange={handleChange} 
              rows={3}
              className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
            />
          </div>
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <h4 className="font-bold text-sm text-charcoal">SEO Metadata</h4>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Title</label>
              <input 
                type="text" name="seoTitle" value={post.seoTitle} onChange={handleChange} 
                className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">SEO Description</label>
              <textarea 
                name="seoDescription" value={post.seoDescription} onChange={handleChange} 
                rows={3}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-terracotta"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogManagementAdmin;
