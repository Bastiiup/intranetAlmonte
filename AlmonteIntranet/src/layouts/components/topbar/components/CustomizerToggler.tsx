import { useLayoutContext } from '@/context/useLayoutContext'
import { TbSettings } from 'react-icons/tb'

const CustomizerToggler = () => {
  const { toggleCustomizer } = useLayoutContext()

  return (
    <div className="topbar-item d-none d-sm-flex">
      <button onClick={toggleCustomizer} className="topbar-link" type="button">
        <TbSettings size={24} className="icon-spin" />
      </button>
    </div>
  )
}

export default CustomizerToggler
