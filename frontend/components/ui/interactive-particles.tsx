"use client"

import { useEffect, useRef, useState } from "react"

interface Particle {
  id: number
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  opacity: number
  color: string
}

export function InteractiveParticles() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 })
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    // Generate random particles
    const colors = [
      "rgb(165, 180, 252)", // indigo-300
      "rgb(196, 181, 253)", // violet-300
      "rgb(147, 197, 253)", // blue-300
      "rgb(129, 140, 248)", // indigo-400
      "rgb(167, 139, 250)", // violet-400
    ]

    const newParticles: Particle[] = []
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 100
      const y = Math.random() * 100
      newParticles.push({
        id: i,
        x,
        y,
        baseX: x,
        baseY: y,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.4 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    setParticles(newParticles)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePos({ x, y })
    }

    const handleMouseLeave = () => {
      setMousePos({ x: -1000, y: -1000 })
    }

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  useEffect(() => {
    const animate = () => {
      setParticles((prev) =>
        prev.map((particle) => {
          const dx = mousePos.x - particle.x
          const dy = mousePos.y - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxDistance = 15

          let newX = particle.x
          let newY = particle.y

          if (distance < maxDistance && distance > 0) {
            // Push particles away from cursor
            const force = (maxDistance - distance) / maxDistance
            const angle = Math.atan2(dy, dx)
            newX = particle.x - Math.cos(angle) * force * 8
            newY = particle.y - Math.sin(angle) * force * 8
          } else {
            // Return to base position with easing
            newX = particle.x + (particle.baseX - particle.x) * 0.05
            newY = particle.y + (particle.baseY - particle.y) * 0.05
          }

          return {
            ...particle,
            x: newX,
            y: newY,
          }
        })
      )
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [mousePos])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Large glowing orbs */}
      <div className="absolute top-[20%] left-[15%] w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-[50%] right-[30%] w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />

      {/* Interactive particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full transition-opacity duration-300"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
        />
      ))}

      {/* Subtle grid lines */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  )
}
