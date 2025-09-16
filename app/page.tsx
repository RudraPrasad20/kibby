import Link from 'next/link'
import React from 'react'

const Home = () => {
  return (
    <div>Home
      <Link href={"/book"}>Book Meeting</Link>
    </div>
  )
}

export default Home