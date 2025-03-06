import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import Product from "@/models/Product";
import { inngest } from "@/config/inngest";
import User from "@/models/User";

export async function POST(request) {
    try {
        const {userId} = getAuth(request)
        const { address, items } = await request.json();

        if (!userId || !address || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid data' });
        }

        const amountArray = await Promise.all(items.map(async (item) => {
            const product = await Product.findById(item.product);
            return product ? product.offerPrice * item.quantity : 0;
        }));

        const amount = amountArray.reduce((acc, price) => acc + price, 0);

        if (amount === 0) {
            return NextResponse.json({ success: false, message: 'Order amount is zero' });
        }

        await inngest.send({
            name: 'order/created',
            data: {
                userId,
                address,
                items,
                amount: amount + Math.floor(amount * 0.02),
                date: Date.now()
            }
        })

        const user = await User.findById(userId)
        user.cartItems = {}
        await user.save()

        return NextResponse.json({ success: true, message: 'Order Placed'})

    } catch (error) {
        return NextResponse.json({ success: false, message: error.message })
    }
}