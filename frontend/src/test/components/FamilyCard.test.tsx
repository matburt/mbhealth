import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../utils/test-utils'
import FamilyCard from '../../components/FamilyCard'
import { mockUser, mockFamilies } from '../utils/test-utils'

const mockFamily = mockFamilies[0]
const mockMembers = [
  {
    id: 1,
    user_id: 1,
    family_id: 1,
    role: 'admin',
    joined_at: '2024-01-01T00:00:00Z',
    user: mockUser
  }
]

const defaultProps = {
  family: mockFamily,
  members: mockMembers,
  onFamilyUpdated: vi.fn(),
  onMemberRemoved: vi.fn(),
  onInviteMember: vi.fn()
}

describe('FamilyCard', () => {
  it('renders family information correctly', () => {
    render(<FamilyCard {...defaultProps} />)
    
    expect(screen.getByText('Test Family')).toBeInTheDocument()
    expect(screen.getByText('A test family')).toBeInTheDocument()
    expect(screen.getByText('1 member')).toBeInTheDocument()
  })

  it('shows invite member button', () => {
    render(<FamilyCard {...defaultProps} />)
    
    const inviteButton = screen.getByText('Invite Member')
    expect(inviteButton).toBeInTheDocument()
  })

  it('calls onInviteMember when invite button is clicked', () => {
    const onInviteMember = vi.fn()
    render(<FamilyCard {...defaultProps} onInviteMember={onInviteMember} />)
    
    const inviteButton = screen.getByText('Invite Member')
    fireEvent.click(inviteButton)
    
    expect(onInviteMember).toHaveBeenCalledTimes(1)
  })

  it('shows correct member count for multiple members', () => {
    const multipleMembers = [
      ...mockMembers,
      {
        id: 2,
        user_id: 2,
        family_id: 1,
        role: 'member',
        joined_at: '2024-01-02T00:00:00Z',
        user: { ...mockUser, id: 2, email: 'member2@example.com' }
      }
    ]
    
    render(<FamilyCard {...defaultProps} members={multipleMembers} />)
    
    expect(screen.getByText('2 members')).toBeInTheDocument()
  })

  it('expands to show member details when view details is clicked', () => {
    render(<FamilyCard {...defaultProps} />)
    
    const viewDetailsButton = screen.getByText('View Details')
    fireEvent.click(viewDetailsButton)
    
    expect(screen.getByText('Family Members')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('shows delete button for admin users who are creators', () => {
    // Set family.created_by to match the current user (admin)
    const adminFamily = { ...mockFamily, created_by: mockUser.id }
    
    render(<FamilyCard {...defaultProps} family={adminFamily} />)
    
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('does not show remove button for current user', () => {
    render(<FamilyCard {...defaultProps} />)
    
    // Expand to see member details
    const viewDetailsButton = screen.getByText('View Details')
    fireEvent.click(viewDetailsButton)
    
    // User cannot remove themselves
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })
})