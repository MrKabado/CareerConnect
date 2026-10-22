import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest, setApiToken } from './lib/api'

type User = {
  id: number
  name: string
  email: string
  role: 'applicant' | 'employer' | 'admin'
}

type Category = {
  id: number
  name: string
}

type Listing = {
  id: number
  listing_type: 'job' | 'ojt'
  title: string
  description: string
  responsibilities: string
  requirements: string
  category?: Category
  location: string
  work_setup: string
  employment_type: string | null
  salary_min: number | null
  salary_max: number | null
  status: 'draft' | 'open' | 'closed' | 'deactivated'
  published_at: string | null
  company?: { name: string; city: string | null; logo_path: string | null }
  admin_actions?: {
    action: 'deactivated' | 'restored'
    reason: string | null
    created_at: string | null
    admin: { id: number; name: string } | null
  }[]
  ojt?: {
    duration_hours: number
    allowance_type: 'paid' | 'unpaid'
    allowance_amount: number | null
    slots: number
    accepted_courses: string[] | null
    moa_accepted: boolean
  } | null
}

type Page<T> = {
  data: T[]
  meta: { current_page: number; last_page: number; total: number }
}

type ListingForm = {
  listing_type: 'job' | 'ojt'
  title: string
  category_id: string
  description: string
  responsibilities: string
  requirements: string
  location: string
  work_setup: string
  employment_type: string
  salary_min: string
  salary_max: string
  duration_hours: string
  allowance_type: 'paid' | 'unpaid'
  allowance_amount: string
  slots: string
  accepted_courses: string
  moa_accepted: boolean
}

const emptyForm: ListingForm = {
  listing_type: 'job',
  title: '',
  category_id: '',
  description: '',
  responsibilities: '',
  requirements: '',
  location: '',
  work_setup: 'onsite',
  employment_type: 'full_time',
  salary_min: '',
  salary_max: '',
  duration_hours: '',
  allowance_type: 'paid',
  allowance_amount: '',
  slots: '1',
  accepted_courses: '',
  moa_accepted: false,
}

const formFields = [
  { name: 'title', label: 'Job title', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
] as const

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function App() {
  const [listings, setListings] = useState<Listing[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Listing | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeArea, setActiveArea] = useState<'explore' | 'manage'>('explore')
  const [showLogin, setShowLogin] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [filters, setFilters] = useState({
    keyword: '',
    category_id: '',
    location: '',
    listing_type: '',
    employment_type: '',
    work_setup: '',
    min_salary: '',
    max_salary: '',
    min_allowance: '',
    max_allowance: '',
  })
  const [form, setForm] = useState<ListingForm>(emptyForm)

  useEffect(() => {
    let ignore = false

    apiRequest<{ data: Category[] }>('categories')
      .then((result) => {
        if (!ignore) setCategories(result.data)
      })
      .catch((requestError: unknown) => {
        if (!ignore) setError(errorMessage(requestError))
      })

    return () => {
      ignore = true
    }
  }, [])

  const loadListings = useCallback((requestedPage = page): Promise<void> => Promise.resolve().then(async () => {
    setIsLoading(true)
    setError('')

    try {
      const query = new URLSearchParams()
      if (activeArea === 'manage' && user !== null && user.role !== 'applicant') {
        const endpoint = user.role === 'admin' ? 'admin/jobs' : 'employer/jobs'
        const result = await apiRequest<Page<Listing>>(`${endpoint}?page=${requestedPage}`)
        setListings(result.data)
        setLastPage(result.meta.last_page)
        setTotal(result.meta.total)
        setSelected(null)
        return
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim() !== '') query.set(key, value.trim())
      })
      query.set('page', String(requestedPage))
      const result = await apiRequest<Page<Listing>>(`jobs?${query.toString()}`)
      setListings(result.data)
      setLastPage(result.meta.last_page)
      setTotal(result.meta.total)
    } catch (requestError) {
      setListings([])
      setError(errorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }), [activeArea, filters, page, user])

  useEffect(() => {
    void loadListings(page)
  }, [loadListings, page])

  async function login(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const result = await apiRequest<{ token: string; user: User }>('login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      setApiToken(result.token)
      setUser(result.user)
      setShowLogin(false)
      setLoginPassword('')
      setActiveArea(result.user.role === 'applicant' ? 'explore' : 'manage')
      setPage(1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiRequest('logout', { method: 'POST' })
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setApiToken(null)
      setUser(null)
      setActiveArea('explore')
      setPage(1)
      setSelected(null)
    }
  }

  async function showDetails(listing: Listing): Promise<void> {
    setError('')
    try {
      const endpoint = activeArea === 'manage' && user?.role === 'employer'
        ? `employer/jobs/${listing.id}`
        : activeArea === 'manage' && user?.role === 'admin'
          ? `admin/jobs/${listing.id}`
          : `jobs/${listing.id}`
      const result = await apiRequest<{ data: Listing }>(endpoint)
      setSelected(result.data)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  function beginCreate(): void {
    setEditingId(null)
    setForm(emptyForm)
    setIsEditing(true)
    setSelected(null)
  }

  async function beginEdit(listing: Listing): Promise<void> {
    try {
      const result = await apiRequest<{ data: Listing }>(`employer/jobs/${listing.id}`)
      const item = result.data
      setEditingId(item.id)
      setForm({
        ...emptyForm,
        listing_type: item.listing_type,
        title: item.title,
        category_id: String(item.category?.id ?? ''),
        description: item.description,
        responsibilities: item.responsibilities,
        requirements: item.requirements,
        location: item.location,
        work_setup: item.work_setup,
        employment_type: item.employment_type ?? 'full_time',
        salary_min: item.salary_min?.toString() ?? '',
        salary_max: item.salary_max?.toString() ?? '',
        duration_hours: item.ojt?.duration_hours.toString() ?? '',
        allowance_type: item.ojt?.allowance_type ?? 'paid',
        allowance_amount: item.ojt?.allowance_amount?.toString() ?? '',
        slots: item.ojt?.slots.toString() ?? '1',
        accepted_courses: item.ojt?.accepted_courses?.join(', ') ?? '',
        moa_accepted: item.ojt?.moa_accepted ?? false,
      })
      setIsEditing(true)
      setSelected(null)
      setError('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function saveListing(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    const payload: Record<string, unknown> = {
      listing_type: form.listing_type,
      title: form.title,
      category_id: Number(form.category_id),
      description: form.description,
      responsibilities: form.responsibilities,
      requirements: form.requirements,
      location: form.location,
      work_setup: form.work_setup,
    }

    if (form.listing_type === 'job') {
      payload.employment_type = form.employment_type
      if (form.salary_min !== '') payload.salary_min = Number(form.salary_min)
      if (form.salary_max !== '') payload.salary_max = Number(form.salary_max)
    } else {
      payload.duration_hours = Number(form.duration_hours)
      payload.allowance_type = form.allowance_type
      if (form.allowance_type === 'paid' && form.allowance_amount !== '') {
        payload.allowance_amount = Number(form.allowance_amount)
      }
      payload.slots = Number(form.slots)
      payload.accepted_courses = form.accepted_courses.split(',').map((course) => course.trim()).filter(Boolean)
      payload.moa_accepted = form.moa_accepted
    }

    try {
      await apiRequest(editingId === null ? 'jobs' : `jobs/${editingId}`, {
        method: editingId === null ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      })
      setIsEditing(false)
      setEditingId(null)
      await loadListings(1)
      setPage(1)
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.errors !== undefined
        ? Object.values(requestError.errors).flat().join(' ')
        : errorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  async function changeStatus(listing: Listing, status: 'draft' | 'open' | 'closed'): Promise<void> {
    try {
      await apiRequest(`jobs/${listing.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await loadListings()
      setSelected(null)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function archive(listing: Listing): Promise<void> {
    try {
      await apiRequest(`jobs/${listing.id}`, { method: 'DELETE' })
      await loadListings()
      setSelected(null)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function moderate(listing: Listing, action: 'deactivate' | 'restore'): Promise<void> {
    const reason = window.prompt(action === 'deactivate' ? 'Why should this listing be deactivated?' : 'Optional restoration note:')
    if (reason === null) return
    if (action === 'deactivate' && reason.trim().length < 3) {
      setError('Please enter a deactivation reason of at least 3 characters.')
      return
    }

    try {
      await apiRequest(`admin/jobs/${listing.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || null }),
      })
      await loadListings()
      setSelected(null)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  function updateFilter(key: keyof typeof filters, value: string): void {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function updateForm(key: keyof ListingForm, value: string | boolean): void {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const isEmployer = user?.role === 'employer'
  const isAdmin = user?.role === 'admin'
  const canManageListings = isEmployer || isAdmin
  const activeListing = selected ?? null

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); setActiveArea('explore'); setSelected(null) }}>
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>CareerConnect</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={activeArea === 'explore' ? 'nav-link active' : 'nav-link'} onClick={() => { setActiveArea('explore'); setPage(1); setSelected(null); setIsEditing(false) }}>
            Find opportunities
          </button>
          {canManageListings && (
            <button className={activeArea === 'manage' ? 'nav-link active' : 'nav-link'} onClick={() => { setActiveArea('manage'); setPage(1); setSelected(null); setIsEditing(false) }}>
              {isAdmin ? 'Moderate listings' : 'My listings'}
            </button>
          )}
        </nav>
        <div className="account-actions">
          {user === null ? (
            <button className="button button-outline" onClick={() => setShowLogin((visible) => !visible)}>
              Sign in
            </button>
          ) : (
            <>
              <span className="user-label">{user.name}</span>
              <button className="button button-outline" onClick={() => { void logout() }}>Sign out</button>
            </>
          )}
        </div>
      </header>

      {showLogin && user === null && (
        <form className="login-panel" onSubmit={(event) => { void login(event) }}>
          <div>
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
          </div>
          <div>
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
          </div>
          <button className="button button-primary" disabled={isSaving}>{isSaving ? 'Signing in…' : 'Sign in'}</button>
        </form>
      )}

      <section className="hero">
        <p className="eyebrow">CAREERCONNECT OPPORTUNITIES</p>
        <h1>{activeArea === 'manage' ? (isAdmin ? 'Listing moderation' : 'Your opportunities') : 'Find work that moves you forward.'}</h1>
        <p className="hero-copy">
          {activeArea === 'manage'
            ? isAdmin ? 'Review listings across CareerConnect and keep the marketplace trustworthy.' : 'Create, publish, and manage your Job and OJT listings in one place.'
            : 'Explore jobs and OJT placements from approved employers. Browse freely and find the right next step.'}
        </p>
        {isEmployer && activeArea === 'manage' && (
          <button className="button button-primary" onClick={beginCreate}>Create a listing <span aria-hidden="true">+</span></button>
        )}
      </section>

      {error !== '' && (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError('')}>×</button>
        </div>
      )}

      {activeArea === 'explore' && (
        <form className="filter-panel" onSubmit={(event) => { event.preventDefault(); setPage(1); void loadListings(1) }}>
          <div className="filter-grid">
            <label className="search-field">
              Search opportunities
              <input value={filters.keyword} onChange={(event) => updateFilter('keyword', event.target.value)} placeholder="Title, skills, or keywords" />
            </label>
            <label>
              Category
              <select value={filters.category_id} onChange={(event) => updateFilter('category_id', event.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label>
              Location
              <input value={filters.location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="City or region" />
            </label>
            <label>
              Opportunity
              <select value={filters.listing_type} onChange={(event) => updateFilter('listing_type', event.target.value)}>
                <option value="">Jobs and OJT</option>
                <option value="job">Job</option>
                <option value="ojt">OJT</option>
              </select>
            </label>
            <label>
              Work setup
              <select value={filters.work_setup} onChange={(event) => updateFilter('work_setup', event.target.value)}>
                <option value="">Any setup</option>
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </label>
            <label>
              Employment type
              <select value={filters.employment_type} onChange={(event) => updateFilter('employment_type', event.target.value)}>
                <option value="">Any type</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </label>
            <label>
              Minimum salary
              <input type="number" min="0" value={filters.min_salary} onChange={(event) => updateFilter('min_salary', event.target.value)} />
            </label>
            <label>
              Maximum salary
              <input type="number" min="0" value={filters.max_salary} onChange={(event) => updateFilter('max_salary', event.target.value)} />
            </label>
            <label>
              Minimum allowance
              <input type="number" min="0" value={filters.min_allowance} onChange={(event) => updateFilter('min_allowance', event.target.value)} />
            </label>
            <label>
              Maximum allowance
              <input type="number" min="0" value={filters.max_allowance} onChange={(event) => updateFilter('max_allowance', event.target.value)} />
            </label>
          </div>
          <div className="filter-actions">
            <p>{total} {total === 1 ? 'opportunity' : 'opportunities'}</p>
            <button className="button button-primary" type="submit">Search listings</button>
          </div>
        </form>
      )}

      {isEditing && isEmployer ? (
        <section className="listing-form-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">EMPLOYER WORKSPACE</p>
              <h2>{editingId === null ? 'Create a listing' : 'Edit listing'}</h2>
              <p>Listings are saved as drafts. Your company must be approved before you can publish.</p>
            </div>
            <button className="button button-outline" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
          <form className="listing-form" onSubmit={(event) => { void saveListing(event) }}>
            <label>
              Opportunity type
              <select value={form.listing_type} onChange={(event) => updateForm('listing_type', event.target.value as 'job' | 'ojt')}>
                <option value="job">Job</option>
                <option value="ojt">OJT placement</option>
              </select>
            </label>
            {formFields.map((field) => (
              <label key={field.name}>
                {field.label}
                <input
                  type={field.type}
                  required
                  value={form[field.name]}
                  onChange={(event) => updateForm(field.name, event.target.value)}
                />
              </label>
            ))}
            <label>
              Category
              <select required value={form.category_id} onChange={(event) => updateForm('category_id', event.target.value)}>
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label>
              Work setup
              <select value={form.work_setup} onChange={(event) => updateForm('work_setup', event.target.value)}>
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </label>
            {form.listing_type === 'job' ? (
              <>
                <label>
                  Employment type
                  <select value={form.employment_type} onChange={(event) => updateForm('employment_type', event.target.value)}>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </label>
                <label>
                  Minimum monthly salary (PHP)
                  <input type="number" min="0" value={form.salary_min} onChange={(event) => updateForm('salary_min', event.target.value)} />
                </label>
                <label>
                  Maximum monthly salary (PHP)
                  <input type="number" min="0" value={form.salary_max} onChange={(event) => updateForm('salary_max', event.target.value)} />
                </label>
              </>
            ) : (
              <>
                <label>
                  OJT hours
                  <input type="number" min="1" required value={form.duration_hours} onChange={(event) => updateForm('duration_hours', event.target.value)} />
                </label>
                <label>
                  Allowance
                  <select value={form.allowance_type} onChange={(event) => updateForm('allowance_type', event.target.value as 'paid' | 'unpaid')}>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </label>
                {form.allowance_type === 'paid' && (
                  <label>
                    Monthly allowance (PHP)
                    <input type="number" min="0" required value={form.allowance_amount} onChange={(event) => updateForm('allowance_amount', event.target.value)} />
                  </label>
                )}
                <label>
                  Available slots
                  <input type="number" min="1" required value={form.slots} onChange={(event) => updateForm('slots', event.target.value)} />
                </label>
                <label>
                  Accepted courses (comma separated)
                  <input value={form.accepted_courses} onChange={(event) => updateForm('accepted_courses', event.target.value)} placeholder="BSIT, BSCS" />
                </label>
                <label className="checkbox-field">
                  <input type="checkbox" checked={form.moa_accepted} onChange={(event) => updateForm('moa_accepted', event.target.checked)} />
                  Accepts a school memorandum of agreement
                </label>
              </>
            )}
            <label className="full-span">
              Description
              <textarea required rows={4} value={form.description} onChange={(event) => updateForm('description', event.target.value)} />
            </label>
            <label className="full-span">
              Responsibilities
              <textarea required rows={4} value={form.responsibilities} onChange={(event) => updateForm('responsibilities', event.target.value)} />
            </label>
            <label className="full-span">
              Requirements and qualifications
              <textarea required rows={4} value={form.requirements} onChange={(event) => updateForm('requirements', event.target.value)} />
            </label>
            <div className="form-actions full-span">
              <button className="button button-primary" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save as draft'}</button>
            </div>
          </form>
        </section>
      ) : (
        <section className="results-section">
          <div className="results-layout">
            <div className="listing-column">
              {isLoading ? (
                <div className="state-card" role="status"><span className="spinner" />Loading opportunities…</div>
              ) : listings.length === 0 ? (
                <div className="state-card empty-state">
                  <span className="empty-icon" aria-hidden="true">⌕</span>
                  <h2>No listings found</h2>
                  <p>{activeArea === 'manage' ? 'Your listing workspace is clear for now.' : 'Try adjusting your search or filters.'}</p>
                </div>
              ) : listings.map((listing) => (
                <article className={activeListing?.id === listing.id ? 'listing-card selected' : 'listing-card'} key={listing.id}>
                  <button className="listing-card-main" onClick={() => { void showDetails(listing) }}>
                    <div className="card-topline">
                      <span className={listing.listing_type === 'ojt' ? 'type-pill ojt-pill' : 'type-pill'}>
                        {listing.listing_type === 'ojt' ? 'OJT' : 'JOB'}
                      </span>
                      {activeArea === 'manage' && <span className={`status-pill status-${listing.status}`}>{listing.status}</span>}
                      <span className="category-name">{listing.category?.name}</span>
                    </div>
                    <h2>{listing.title}</h2>
                    <p className="company-name">{listing.company?.name ?? 'Verified employer'}</p>
                    <p className="card-summary">{listing.description}</p>
                    <div className="card-meta">
                      <span>{listing.location}</span>
                      <span>{listing.work_setup}</span>
                      <span>{listing.listing_type === 'job' ? listing.employment_type?.replace('_', ' ') : `${listing.ojt?.duration_hours ?? '—'} OJT hours`}</span>
                    </div>
                    <div className="card-footer">
                      <strong>{compensation(listing)}</strong>
                      <span className="text-link">View details <span aria-hidden="true">→</span></span>
                    </div>
                  </button>
                  {activeArea === 'manage' && isEmployer && listing.status !== 'deactivated' && (
                    <div className="card-controls">
                      <button className="text-button" onClick={() => { void beginEdit(listing) }}>Edit</button>
                      {listing.status !== 'open' && <button className="text-button" onClick={() => { void changeStatus(listing, 'open') }}>Publish</button>}
                      {listing.status === 'open' && <button className="text-button" onClick={() => { void changeStatus(listing, 'closed') }}>Close</button>}
                      <button className="text-button danger-text" onClick={() => { void archive(listing) }}>Archive</button>
                    </div>
                  )}
                  {activeArea === 'manage' && isAdmin && (
                    <div className="card-controls">
                      {listing.status === 'deactivated'
                        ? <button className="text-button" onClick={() => { void moderate(listing, 'restore') }}>Restore as closed</button>
                        : <button className="text-button danger-text" onClick={() => { void moderate(listing, 'deactivate') }}>Deactivate</button>}
                    </div>
                  )}
                </article>
              ))}

              {!isLoading && lastPage > 1 && (
                <div className="pagination">
                  <button className="button button-outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                  <span>Page {page} of {lastPage}</span>
                  <button className="button button-outline" disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)}>Next</button>
                </div>
              )}
            </div>

            {selected !== null && (
              <aside className="detail-panel" aria-labelledby="detail-title">
                <button className="close-detail" aria-label="Close listing details" onClick={() => setSelected(null)}>×</button>
                <span className={selected.listing_type === 'ojt' ? 'type-pill ojt-pill' : 'type-pill'}>{selected.listing_type === 'ojt' ? 'OJT PLACEMENT' : 'JOB OPPORTUNITY'}</span>
                <p className="eyebrow">{selected.category?.name}</p>
                <h2 id="detail-title">{selected.title}</h2>
                <p className="company-name">{selected.company?.name}</p>
                <p className="detail-compensation">{compensation(selected)}</p>
                <div className="detail-meta"><span>{selected.location}</span><span>{selected.work_setup}</span></div>
                {selected.ojt && <p className="detail-note">{selected.ojt.slots} slots · {selected.ojt.moa_accepted ? 'MOA accepted' : 'MOA not required'}</p>}
                <section><h3>About this opportunity</h3><p>{selected.description}</p></section>
                <section><h3>Responsibilities</h3><p>{selected.responsibilities}</p></section>
                <section><h3>Requirements</h3><p>{selected.requirements}</p></section>
                {selected.ojt?.accepted_courses && selected.ojt.accepted_courses.length > 0 && (
                  <section><h3>Accepted courses</h3><p>{selected.ojt.accepted_courses.join(', ')}</p></section>
                )}
                {isAdmin && selected.admin_actions && selected.admin_actions.length > 0 && (
                  <section>
                    <h3>Moderation history</h3>
                    {selected.admin_actions.map((action, index) => (
                      <p key={`${action.action}-${action.created_at ?? index}`}>
                        {action.action} by {action.admin?.name ?? 'former administrator'}
                        {action.reason ? ` — ${action.reason}` : ''}
                        {action.created_at ? ` (${new Date(action.created_at).toLocaleDateString()})` : ''}
                      </p>
                    ))}
                  </section>
                )}
                {activeArea === 'manage' && isEmployer && selected.status !== 'deactivated' && (
                  <div className="detail-actions">
                    <button className="button button-primary" onClick={() => { void beginEdit(selected) }}>Edit listing</button>
                    {selected.status !== 'open' && <button className="button button-outline" onClick={() => { void changeStatus(selected, 'open') }}>Publish listing</button>}
                    {selected.status === 'open' && <button className="button button-outline" onClick={() => { void changeStatus(selected, 'closed') }}>Close listing</button>}
                  </div>
                )}
              </aside>
            )}
          </div>
        </section>
      )}

      <footer className="site-footer">
        <span>CareerConnect</span>
        <span>Connecting people with meaningful work and learning.</span>
      </footer>
    </main>
  )
}

function compensation(listing: Listing): string {
  if (listing.listing_type === 'ojt') {
    if (listing.ojt?.allowance_type !== 'paid') return 'Unpaid placement'
    return listing.ojt.allowance_amount === null
      ? 'Paid placement'
      : `₱${listing.ojt.allowance_amount.toLocaleString()} allowance`
  }
  if (listing.salary_min === null && listing.salary_max === null) return 'Salary not specified'
  if (listing.salary_min === null) return `Up to ₱${listing.salary_max?.toLocaleString()}`
  if (listing.salary_max === null) return `From ₱${listing.salary_min.toLocaleString()}`
  return `₱${listing.salary_min.toLocaleString()} – ₱${listing.salary_max.toLocaleString()} / month`
}

export default App
