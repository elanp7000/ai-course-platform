import { ImageResponse } from 'next/og'
import { Sparkles } from 'lucide-react'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 20,
                    background: 'linear-gradient(to top right, #3b82f6, #4f46e5)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '8px',
                }}
            >
                <Sparkles size={20} color="white" />
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    )
}
